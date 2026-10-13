import { useCallback, useRef, useMemo, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Pin, PinOff, Wand2, FileText, Loader2, ChevronDown, Download } from "lucide-react";
import { useAppStore, type Note } from "@/store/useAppStore";
import { AIResultPanel } from "@/components/AIResultPanel";
import { MeetingFields } from "@/templates/MeetingFields";
import { ChangelogFields } from "@/templates/ChangelogFields";
import { WorkflowFields } from "@/templates/WorkflowFields";
import { EmailFields } from "@/templates/EmailFields";
import { BookFields } from "@/templates/BookFields";
import { LedgerFields } from "@/templates/LedgerFields";
import { NOTE_TYPES } from "@/templates";
import { AIRewrite, AISummarize, ExportNotePDF } from "../../wailsjs/go/main/App";
import { cn } from "@/lib/utils";

const TONES = [
  { id: "professional", label: "Professional" },
  { id: "casual", label: "Casual" },
  { id: "formal", label: "Formal" },
  { id: "friendly", label: "Friendly" },
  { id: "concise", label: "Concise" },
  { id: "creative", label: "Creative" },
];

interface EditorProps {
  note: Note;
  onSave: (note: Note) => void;
  onDelete: (id: number) => void;
}

export function Editor({ note, onSave, onDelete }: EditorProps) {
  const updateNote = useAppStore((s) => s.updateNote);
  const settings = useAppStore((s) => s.settings);
  const editorSessionKey = useAppStore((s) => s.editorSessionKey);
  const showConfirm = useAppStore((s) => s.showConfirm);
  const titleRef = useRef<HTMLInputElement>(null);

  // AI state
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState<"rewrite" | "summarize">("rewrite");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showToneMenu, setShowToneMenu] = useState(false);
  const selectionRef = useRef<{ from: number; to: number } | null>(null);

  const hasAI = Boolean(settings.claudeApiKey || settings.geminiApiKey || settings.grokApiKey || settings.groqApiKey);

  // Keep the latest note/callbacks accessible from inside the TipTap event closures,
  // which are captured once per editor init (and we intentionally don't re-init on draft→saved).
  const noteRef = useRef(note);
  noteRef.current = note;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Placeholder.configure({
          placeholder: "Start writing...",
        }),
      ],
      content: note.content || "",
      onUpdate: ({ editor }) => {
        const content = editor.getHTML();
        const updated = { ...noteRef.current, content };
        updateNote(updated);
        onSaveRef.current(updated);
      },
      onSelectionUpdate: ({ editor }) => {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          selectionRef.current = { from, to };
        }
      },
      editorProps: {
        attributes: {
          class: "max-w-none focus:outline-none min-h-[300px] px-1 py-2 text-th-text leading-relaxed",
          style: `font-size: ${settings.fontSize}px`,
        },
      },
    },
    [editorSessionKey, settings.fontSize]
  );

  // Word count for book template — derived from HTML content so it stays in sync without extra editor calls.
  const wordCount = useMemo(() => {
    if (note.noteType !== "book") return 0;
    const text = note.content.replace(/<[^>]*>/g, " ").trim();
    return text ? text.split(/\s+/).length : 0;
  }, [note.noteType, note.content]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const updated = { ...note, title: e.target.value };
      updateNote(updated);
      onSave(updated);
    },
    [note, updateNote, onSave]
  );

  const handleMetadataChange = useCallback(
    (metadata: string) => {
      const updated = { ...note, metadata };
      updateNote(updated);
      onSave(updated);
    },
    [note, updateNote, onSave]
  );

  const togglePin = useCallback(() => {
    const updated = { ...note, pinned: !note.pinned };
    updateNote(updated);
    onSave(updated);
  }, [note, updateNote, onSave]);

  // AI handlers
  const getTextForAI = useCallback(() => {
    if (!editor) return "";
    const sel = selectionRef.current;
    if (sel && sel.from !== sel.to) {
      return editor.state.doc.textBetween(sel.from, sel.to, " ");
    }
    return editor.getText();
  }, [editor]);

  const extractError = (err: unknown): string => {
    if (typeof err === "string") return err;
    if (err instanceof Error) return err.message;
    if (err && typeof (err as any).message === "string") return (err as any).message;
    return "An unexpected error occurred. Please try again.";
  };

  const handleRewrite = useCallback(
    async (tone: string) => {
      setShowToneMenu(false);
      const text = getTextForAI();
      if (!text.trim()) {
        setAiError("No text to rewrite. Write something or select text first.");
        return;
      }
      setAiMode("rewrite");
      setAiLoading(true);
      setAiError(null);
      setAiResult(null);
      try {
        const result = await AIRewrite(text, tone);
        if (!result || !result.trim()) {
          setAiError("AI returned an empty response. Please try again.");
          return;
        }
        setAiResult(result);
      } catch (err: unknown) {
        setAiError(extractError(err));
      } finally {
        setAiLoading(false);
      }
    },
    [getTextForAI]
  );

  const handleSummarize = useCallback(async () => {
    const text = getTextForAI();
    if (!text.trim()) {
      setAiError("No text to summarize. Write something first.");
      return;
    }
    setAiMode("summarize");
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    try {
      const result = await AISummarize(text);
      if (!result || !result.trim()) {
        setAiError("AI returned an empty response. Please try again.");
        return;
      }
      setAiResult(result);
    } catch (err: unknown) {
      setAiError(extractError(err));
    } finally {
      setAiLoading(false);
    }
  }, [getTextForAI]);

  const handleAcceptAI = useCallback(() => {
    if (!editor || !aiResult) return;
    const sel = selectionRef.current;
    if (sel && sel.from !== sel.to) {
      editor.chain().focus().insertContentAt({ from: sel.from, to: sel.to }, aiResult).run();
    } else {
      editor.chain().focus().setContent(aiResult).run();
    }
    setAiResult(null);
    selectionRef.current = null;
  }, [editor, aiResult]);

  const handleDiscardAI = useCallback(() => {
    setAiResult(null);
    setAiError(null);
    selectionRef.current = null;
  }, []);

  const typeLabel = NOTE_TYPES.find((t) => t.id === note.noteType)?.label || "Note";

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-th-bg min-w-0">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-th-border">
        <Input
          ref={titleRef}
          value={note.title}
          onChange={handleTitleChange}
          placeholder="Untitled"
          className="text-lg font-semibold border-none bg-transparent shadow-none focus-visible:ring-0 px-0 h-auto"
        />
        <span className="text-xs text-th-text-muted bg-th-surface px-2 py-0.5 rounded shrink-0">
          {typeLabel}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePin}
          title={note.pinned ? "Unpin" : "Pin"}
        >
          {note.pinned ? (
            <PinOff className="h-4 w-4 text-th-accent" />
          ) : (
            <Pin className="h-4 w-4 text-th-text-muted" />
          )}
        </Button>
        {note.noteType !== "ledger" && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => ExportNotePDF(note.id)}
            title="Export as PDF"
          >
            <Download className="h-4 w-4 text-th-text-muted" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            showConfirm({
              title: "Delete note?",
              message: `"${note.title || "Untitled"}" will be permanently removed. This can't be undone.`,
              confirmLabel: "Delete",
              destructive: true,
              onConfirm: () => onDelete(note.id),
            })
          }
          title="Delete note"
        >
          <Trash2 className="h-4 w-4 text-th-text-muted" />
        </Button>
      </div>

      {/* AI toolbar */}
      {hasAI && note.noteType !== "ledger" && (
        <div className="flex items-center gap-2 px-6 py-2 border-b border-th-border bg-th-sidebar/20">
          {/* Rewrite with tone picker */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              disabled={aiLoading}
              onClick={() => setShowToneMenu(!showToneMenu)}
              className="text-xs h-7 gap-1"
            >
              {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              Rewrite
              <ChevronDown className="h-3 w-3" />
            </Button>
            {showToneMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowToneMenu(false)} />
                <div className="absolute top-full left-0 mt-1 z-50 bg-th-sidebar border border-th-border rounded-lg shadow-lg py-1 min-w-[140px]">
                  {TONES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleRewrite(t.id)}
                      className="w-full text-left px-3 py-1.5 text-xs text-th-text hover:bg-th-surface/50 transition-colors"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Summarize */}
          <Button
            variant="ghost"
            size="sm"
            disabled={aiLoading}
            onClick={handleSummarize}
            className="text-xs h-7 gap-1"
          >
            {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            Summarize
          </Button>

          {aiLoading && (
            <span className="text-[10px] text-th-text-muted ml-2">Generating...</span>
          )}
          {aiError && (
            <span
              className="text-[10px] text-red-400 ml-2 cursor-pointer hover:text-red-300"
              title="Click to dismiss"
              onClick={() => setAiError(null)}
            >
              {aiError}
            </span>
          )}
        </div>
      )}

      {/* Template fields (if not plain and not ledger) */}
      {note.noteType !== "plain" && note.noteType !== "ledger" && (
        <div className="px-6 py-4 border-b border-th-border bg-th-sidebar/30">
          <TemplateFields
            noteType={note.noteType}
            metadata={note.metadata}
            onChange={handleMetadataChange}
            wordCount={wordCount}
          />
        </div>
      )}

      {/* Ledger takes the full content area — no text editor */}
      {note.noteType === "ledger" && (
        <div className="flex-1 px-6 py-4 min-h-0 min-w-0 overflow-hidden">
          <LedgerFields metadata={note.metadata} onChange={handleMetadataChange} />
        </div>
      )}

      {/* Editor area (hidden for ledger — ledger uses only the data table) */}
      {note.noteType !== "ledger" && (
        <div className="flex-1 overflow-auto px-6 py-4 min-w-0">
          <div className="max-w-full overflow-hidden">
            <EditorContent editor={editor} />
          </div>
        </div>
      )}

      {/* AI result panel */}
      {aiResult && (
        <AIResultPanel
          result={aiResult}
          mode={aiMode}
          onAccept={handleAcceptAI}
          onDiscard={handleDiscardAI}
        />
      )}
    </div>
  );
}

function TemplateFields({
  noteType,
  metadata,
  onChange,
  wordCount,
}: {
  noteType: string;
  metadata: string;
  onChange: (m: string) => void;
  wordCount: number;
}) {
  switch (noteType) {
    case "meeting":
      return <MeetingFields metadata={metadata} onChange={onChange} />;
    case "changelog":
      return <ChangelogFields metadata={metadata} onChange={onChange} />;
    case "workflow":
      return <WorkflowFields metadata={metadata} onChange={onChange} />;
    case "email":
      return <EmailFields metadata={metadata} onChange={onChange} />;
    case "book":
      return <BookFields metadata={metadata} onChange={onChange} currentWordCount={wordCount} />;
    case "ledger":
      return <LedgerFields metadata={metadata} onChange={onChange} />;
    default:
      return null;
  }
}
