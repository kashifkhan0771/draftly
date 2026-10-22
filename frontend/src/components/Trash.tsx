import { useCallback, useEffect, useState } from "react";
import { Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore, type Note } from "@/store/useAppStore";
import { GetNotes, GetTrashedNotes, RestoreNote, DeleteNoteForever } from "../../wailsjs/go/main/App";

// Must match trashRetention in backend/db/db.go.
const TRASH_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

// daysLeft returns how many days a trashed note has before it is removed for good.
function daysLeft(deletedAt: string): number {
  const removeAt = new Date(deletedAt).getTime() + TRASH_DAYS * DAY_MS;
  return Math.max(0, Math.ceil((removeAt - Date.now()) / DAY_MS));
}

export function Trash() {
  const setNotes = useAppStore((s) => s.setNotes);
  const showConfirm = useAppStore((s) => s.showConfirm);
  const [trashed, setTrashed] = useState<Note[]>([]);

  const loadTrash = useCallback(async () => {
    try {
      setTrashed((await GetTrashedNotes()) ?? []);
    } catch (err) {
      console.error("Failed to load trash:", err);
    }
  }, []);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  // Restore the note, then reload the main list so it shows up again.
  const handleRestore = async (id: number) => {
    try {
      await RestoreNote(id);
      setNotes((await GetNotes()) ?? []);
      await loadTrash();
    } catch (err) {
      console.error("Failed to restore note:", err);
    }
  };

  const handleDeleteForever = async (id: number) => {
    try {
      await DeleteNoteForever(id);
      await loadTrash();
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-th-bg">
      <div className="max-w-4xl mx-auto px-8 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-lg bg-th-accent/10 flex items-center justify-center">
            <Trash2 className="h-4 w-4 text-th-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-th-text">Trash</h1>
            <p className="text-xs text-th-text-muted">
              Notes are removed for good after {TRASH_DAYS} days
            </p>
          </div>
        </div>

        {trashed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Trash2 className="h-10 w-10 text-th-text-muted/30 mb-4" />
            <p className="text-sm text-th-text-muted">Trash is empty</p>
          </div>
        ) : (
          <div className="space-y-2">
            {trashed.map((note) => {
              const left = daysLeft(note.deletedAt);
              return (
                <div
                  key={note.id}
                  className="flex items-center gap-4 rounded-xl border border-th-border bg-th-sidebar px-5 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-th-text truncate">
                      {note.title || "Untitled"}
                    </h3>
                    <p className="text-[11px] text-th-text-muted">
                      {left === 1 ? "1 day left" : `${left} days left`}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleRestore(note.id)}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Restore
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600"
                    onClick={() =>
                      showConfirm({
                        title: "Delete forever?",
                        message: `"${note.title || "Untitled"}" will be permanently removed. This can't be undone.`,
                        confirmLabel: "Delete forever",
                        destructive: true,
                        onConfirm: () => handleDeleteForever(note.id),
                      })
                    }
                  >
                    Delete forever
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
