import {
  FileText,
  Users,
  Tag,
  ListChecks,
  Mail,
  BookOpen,
  Table,
  Pin,
} from "lucide-react";
import { useAppStore, type Note } from "@/store/useAppStore";
import { NOTE_TYPES } from "@/templates";
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

const noteTypeLabels: Record<string, string> = {
  plain: "Note",
  meeting: "Meeting",
  changelog: "Changelog",
  workflow: "Workflow",
  email: "Email",
  book: "Book",
  ledger: "Ledger",
};

export function Pinboard() {
  const notes = useAppStore((s) => s.notes);
  const setActiveNoteId = useAppStore((s) => s.setActiveNoteId);

  const pinned = notes
    .filter((n) => n.pinned)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <div className="flex-1 overflow-auto bg-th-bg">
      <div className="max-w-4xl mx-auto px-8 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-lg bg-th-accent/10 flex items-center justify-center">
            <Pin className="h-4 w-4 text-th-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-th-text">Pinboard</h1>
            <p className="text-xs text-th-text-muted">
              {pinned.length} pinned {pinned.length === 1 ? "note" : "notes"}
            </p>
          </div>
        </div>

        {pinned.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Pin className="h-10 w-10 text-th-text-muted/30 mb-4" />
            <p className="text-sm text-th-text-muted">No pinned notes yet</p>
            <p className="text-xs text-th-text-muted/60 mt-1">
              Pin a note from the editor to see it here
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {pinned.map((note) => (
              <PinCard
                key={note.id}
                note={note}
                onClick={() => setActiveNoteId(note.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PinCard({ note, onClick }: { note: Note; onClick: () => void }) {
  const title = note.title || "Untitled";
  const typeLabel = noteTypeLabels[note.noteType] || "Note";
  const typeIcon = NOTE_TYPES.find((t) => t.id === note.noteType)?.icon || "FileText";
  const Icon = ICONS[typeIcon];
  const color = TYPE_COLORS[note.noteType] || "var(--th-accent)";

  // Strip HTML for preview
  const preview = note.content.replace(/<[^>]*>/g, "").slice(0, 120);

  return (
    <button
      onClick={onClick}
      className={cn(
        "text-left rounded-xl border border-th-border bg-th-sidebar p-5",
        "hover:border-th-accent/30 transition-all group",
        "hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
      )}
    >
      {/* Accent top bar */}
      <div
        className="w-full h-1 rounded-full mb-4 opacity-60 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: color }}
      />

      {/* Type badge */}
      <div className="flex items-center gap-1.5 mb-3">
        {Icon && <span style={{ color }}><Icon className="h-3 w-3" /></span>}
        <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color }}>
          {typeLabel}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-th-text mb-2 line-clamp-2 group-hover:text-th-accent transition-colors">
        {title}
      </h3>

      {/* Preview */}
      {preview && (
        <p className="text-xs text-th-text-muted line-clamp-3 leading-relaxed mb-3">
          {preview}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-th-text-muted/50">
          {new Date(note.updatedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>
        <Pin className="h-3 w-3 text-th-accent/50" />
      </div>
    </button>
  );
}
