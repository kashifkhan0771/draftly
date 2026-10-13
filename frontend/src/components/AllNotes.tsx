import { useMemo, useState } from "react";
import {
  FileText,
  Users,
  Tag,
  ListChecks,
  Mail,
  BookOpen,
  Table,
  Pin,
  Plus,
  Trash2,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAppStore, type Note } from "@/store/useAppStore";
import { NOTE_TYPES, type NoteTypeId } from "@/templates";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Users,
  Tag,
  ListChecks,
  Mail,
  BookOpen,
  Table,
};

const TYPE_COLORS: Record<string, string> = {
  plain: "var(--th-accent)",
  meeting: "#3b82f6",
  changelog: "#22c55e",
  workflow: "#f59e0b",
  email: "#ec4899",
  book: "#8b5cf6",
  ledger: "#14b8a6",
};

type SortMode = "recent" | "oldest" | "alpha";

interface AllNotesProps {
  onNewNote: (type: NoteTypeId) => void;
  onDelete: (id: number) => void;
}

export function AllNotes({ onNewNote, onDelete }: AllNotesProps) {
  const notes = useAppStore((s) => s.notes);
  const setActiveNoteId = useAppStore((s) => s.setActiveNoteId);
  const showConfirm = useAppStore((s) => s.showConfirm);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byType = typeFilter === "all"
      ? notes
      : notes.filter((n) => n.noteType === typeFilter);
    const bySearch = q
      ? byType.filter((n) => n.title.toLowerCase().includes(q))
      : byType;

    const sorted = [...bySearch];
    switch (sortMode) {
      case "recent":
        sorted.sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
        break;
      case "oldest":
        sorted.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        break;
      case "alpha":
        sorted.sort((a, b) =>
          (a.title || "Untitled").localeCompare(b.title || "Untitled")
        );
        break;
    }
    return sorted;
  }, [notes, typeFilter, sortMode, search]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of notes) counts[n.noteType] = (counts[n.noteType] || 0) + 1;
    return counts;
  }, [notes]);

  return (
    <div className="flex-1 overflow-auto bg-th-bg">
      <div className="max-w-6xl mx-auto px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold text-th-text">All Notes</h1>
            <p className="text-xs text-th-text-muted mt-0.5">
              {notes.length} {notes.length === 1 ? "note" : "notes"} total
            </p>
          </div>
          <button
            onClick={() => onNewNote("plain")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-th-accent text-white text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="h-3.5 w-3.5" />
            New Note
          </button>
        </div>

        {/* Search + Sort */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-th-text-muted" />
            <Input
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-th-sidebar"
            />
          </div>
          <div className="flex items-center gap-1 bg-th-sidebar border border-th-border rounded-md p-0.5">
            {(
              [
                { id: "recent", label: "Recent" },
                { id: "oldest", label: "Oldest" },
                { id: "alpha", label: "A–Z" },
              ] as { id: SortMode; label: string }[]
            ).map((s) => (
              <button
                key={s.id}
                onClick={() => setSortMode(s.id)}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                  sortMode === s.id
                    ? "bg-th-surface text-th-text"
                    : "text-th-text-muted hover:text-th-text"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Type filter chips */}
        <div className="flex flex-wrap items-center gap-1.5 mb-6">
          <FilterChip
            label="All"
            count={notes.length}
            active={typeFilter === "all"}
            onClick={() => setTypeFilter("all")}
          />
          {NOTE_TYPES.map(({ id, label }) => {
            const count = typeCounts[id] || 0;
            if (count === 0) return null;
            return (
              <FilterChip
                key={id}
                label={label}
                count={count}
                active={typeFilter === id}
                color={TYPE_COLORS[id]}
                onClick={() => setTypeFilter(id)}
              />
            );
          })}
        </div>

        {/* Notes grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <FileText className="h-10 w-10 text-th-text-muted/30 mb-4" />
            <p className="text-sm text-th-text-muted">
              {notes.length === 0 ? "No notes yet" : "No matching notes"}
            </p>
            {notes.length === 0 && (
              <p className="text-xs text-th-text-muted/60 mt-1">
                Click "New Note" above or pick a template on Home
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onClick={() => setActiveNoteId(note.id)}
                onDelete={() =>
                  showConfirm({
                    title: "Delete note?",
                    message: `"${note.title || "Untitled"}" will be permanently removed. This can't be undone.`,
                    confirmLabel: "Delete",
                    destructive: true,
                    onConfirm: () => onDelete(note.id),
                  })
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  color,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border",
        active
          ? "bg-th-accent/10 border-th-accent/40 text-th-accent"
          : "bg-th-sidebar border-th-border text-th-text-muted hover:text-th-text"
      )}
    >
      {color && active && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  );
}

function NoteCard({
  note,
  onClick,
  onDelete,
}: {
  note: Note;
  onClick: () => void;
  onDelete: () => void;
}) {
  const title = note.title || "Untitled";
  const typeMeta = NOTE_TYPES.find((t) => t.id === note.noteType);
  const typeLabel = typeMeta?.label || "Note";
  const Icon = ICONS[typeMeta?.icon || "FileText"];
  const color = TYPE_COLORS[note.noteType] || "var(--th-accent)";
  const preview = note.content.replace(/<[^>]*>/g, "").slice(0, 140);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group relative text-left rounded-xl border border-th-border bg-th-sidebar p-5 cursor-pointer",
        "hover:border-th-accent/30 transition-all",
        "hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
      )}
    >
      <div
        className="w-full h-1 rounded-full mb-4 opacity-60 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: color }}
      />

      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          {Icon && (
            <span style={{ color }}>
              <Icon className="h-3 w-3 shrink-0" />
            </span>
          )}
          <span
            className="text-[10px] font-medium uppercase tracking-wider truncate"
            style={{ color }}
          >
            {typeLabel}
          </span>
        </div>
        {note.pinned && <Pin className="h-3 w-3 text-th-accent/70 shrink-0" />}
      </div>

      <h3 className="text-sm font-semibold text-th-text mb-2 line-clamp-2 group-hover:text-th-accent transition-colors">
        {title}
      </h3>

      {preview && (
        <p className="text-xs text-th-text-muted line-clamp-3 leading-relaxed mb-3">
          {preview}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-th-text-muted/50">
          {new Date(note.updatedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <button
          type="button"
          onClick={handleDeleteClick}
          title="Delete note"
          aria-label={`Delete ${title}`}
          className="opacity-0 group-hover:opacity-100 flex items-center justify-center h-6 w-6 rounded text-th-text-muted hover:text-red-400 hover:bg-th-surface transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
