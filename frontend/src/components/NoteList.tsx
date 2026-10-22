import { Pin, FileText, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore, type Note } from "@/store/useAppStore";

const SIDEBAR_NOTE_LIMIT = 10;

interface NoteListProps {
  onDelete: (id: number) => void;
}

export function NoteList({ onDelete }: NoteListProps) {
  const notes = useAppStore((s) => s.notes);
  const activeNoteId = useAppStore((s) => s.activeNoteId);
  const setActiveNoteId = useAppStore((s) => s.setActiveNoteId);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const showConfirm = useAppStore((s) => s.showConfirm);

  const query = searchQuery.toLowerCase();
  const sorted = notes
    .filter((n) => n.title.toLowerCase().includes(query))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    })
    .slice(0, SIDEBAR_NOTE_LIMIT);

  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-0.5">
        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 px-3">
            <p className="text-sm text-th-text-muted text-center">
              {notes.length === 0 ? "No notes yet" : "No matching notes"}
            </p>
            {notes.length === 0 && (
              <p className="text-xs text-th-text-muted/60 mt-1 text-center">
                Click "New Note" to get started
              </p>
            )}
          </div>
        )}
        {sorted.map((note) => (
          <NoteItem
            key={note.id}
            note={note}
            isActive={note.id === activeNoteId}
            onClick={() => setActiveNoteId(note.id)}
            onDelete={() =>
              showConfirm({
                title: "Move to trash?",
                message: `"${note.title || "Untitled"}" will move to the trash. You can restore it from there for 30 days.`,
                confirmLabel: "Move to trash",
                destructive: true,
                onConfirm: () => onDelete(note.id),
              })
            }
          />
        ))}
      </div>
    </ScrollArea>
  );
}

function NoteItem({
  note,
  isActive,
  onClick,
  onDelete,
}: {
  note: Note;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const title = note.title || "Untitled";

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
        "group w-full text-left rounded-md px-3 py-2 transition-colors relative border-l-2 cursor-pointer",
        isActive
          ? "border-l-th-accent bg-[color-mix(in_srgb,var(--th-accent)_8%,transparent)]"
          : "border-l-transparent hover:bg-th-surface/50"
      )}
    >
      <div className="flex items-center gap-2">
        <FileText
          className={cn(
            "h-4 w-4 shrink-0",
            isActive ? "text-th-accent" : "text-th-text-muted"
          )}
        />
        <span
          className={cn(
            "text-sm font-medium truncate flex-1",
            isActive ? "text-th-text" : "text-th-text/80"
          )}
        >
          {title}
        </span>
        {note.pinned && (
          <Pin
            className={cn(
              "h-3 w-3 shrink-0",
              isActive ? "text-th-accent" : "text-th-text-muted"
            )}
          />
        )}
        <button
          type="button"
          onClick={handleDeleteClick}
          onKeyDown={(e) => e.stopPropagation()}
          title="Delete note"
          aria-label={`Delete ${title}`}
          className="flex items-center justify-center h-6 w-6 rounded shrink-0 opacity-30 hover:opacity-100 hover:bg-red-500/10 text-th-text-muted hover:text-red-400 transition-opacity"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="text-xs text-th-text-muted/60 mt-0.5 ml-6">
        {new Date(note.updatedAt).toLocaleDateString()}
      </p>
    </div>
  );
}
