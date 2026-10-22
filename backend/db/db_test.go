package db

import (
	"database/sql"
	"path/filepath"
	"testing"
	"time"
)

// newTestStore opens a fresh database in a temp folder for one test.
func newTestStore(t *testing.T) *Store {
	t.Helper()
	s, err := open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	t.Cleanup(func() { s.Close() })
	return s
}

func saveTestNote(t *testing.T, s *Store, title string) Note {
	t.Helper()
	n, err := s.SaveNote(Note{Title: title})
	if err != nil {
		t.Fatalf("save note: %v", err)
	}
	return n
}

// noteIDs returns the IDs of the given notes, in order.
func noteIDs(notes []Note) []int64 {
	ids := []int64{}
	for _, n := range notes {
		ids = append(ids, n.ID)
	}
	return ids
}

func mustGetNotes(t *testing.T, s *Store) []Note {
	t.Helper()
	notes, err := s.GetNotes()
	if err != nil {
		t.Fatalf("get notes: %v", err)
	}
	return notes
}

func mustGetTrash(t *testing.T, s *Store) []Note {
	t.Helper()
	notes, err := s.GetTrashedNotes()
	if err != nil {
		t.Fatalf("get trashed notes: %v", err)
	}
	return notes
}

func TestDeleteMovesNoteToTrash(t *testing.T) {
	s := newTestStore(t)
	keep := saveTestNote(t, s, "keep")
	gone := saveTestNote(t, s, "gone")

	if err := s.DeleteNote(gone.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}

	if ids := noteIDs(mustGetNotes(t, s)); len(ids) != 1 || ids[0] != keep.ID {
		t.Errorf("notes = %v, want only %d", ids, keep.ID)
	}
	trash := mustGetTrash(t, s)
	if len(trash) != 1 || trash[0].ID != gone.ID {
		t.Fatalf("trash = %v, want only %d", noteIDs(trash), gone.ID)
	}
	if trash[0].DeletedAt == "" {
		t.Error("trashed note has empty DeletedAt")
	}
}

func TestRestoreNote(t *testing.T) {
	s := newTestStore(t)
	n := saveTestNote(t, s, "back again")

	if err := s.DeleteNote(n.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if err := s.RestoreNote(n.ID); err != nil {
		t.Fatalf("restore: %v", err)
	}

	notes := mustGetNotes(t, s)
	if len(notes) != 1 || notes[0].ID != n.ID || notes[0].DeletedAt != "" {
		t.Errorf("notes after restore = %+v", notes)
	}
	if trash := mustGetTrash(t, s); len(trash) != 0 {
		t.Errorf("trash after restore = %v, want empty", noteIDs(trash))
	}
}

func TestDeleteNoteForever(t *testing.T) {
	s := newTestStore(t)
	live := saveTestNote(t, s, "live")
	trashed := saveTestNote(t, s, "trashed")

	if err := s.DeleteNote(trashed.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if err := s.DeleteNoteForever(trashed.ID); err != nil {
		t.Fatalf("delete forever: %v", err)
	}
	if trash := mustGetTrash(t, s); len(trash) != 0 {
		t.Errorf("trash = %v, want empty", noteIDs(trash))
	}

	// a note that is not in the trash must not be removed
	if err := s.DeleteNoteForever(live.ID); err != nil {
		t.Fatalf("delete forever on live note: %v", err)
	}
	if ids := noteIDs(mustGetNotes(t, s)); len(ids) != 1 || ids[0] != live.ID {
		t.Errorf("notes = %v, want only %d", ids, live.ID)
	}
}

func TestPurgeTrashRemovesOnlyOldNotes(t *testing.T) {
	s := newTestStore(t)
	old := saveTestNote(t, s, "old")
	recent := saveTestNote(t, s, "recent")
	live := saveTestNote(t, s, "live")

	// put both in the trash, then backdate one past the retention window
	for _, id := range []int64{old.ID, recent.ID} {
		if err := s.DeleteNote(id); err != nil {
			t.Fatalf("delete: %v", err)
		}
	}
	longAgo := time.Now().Add(-trashRetention - time.Hour).UTC().Format(time.RFC3339)
	if _, err := s.db.Exec("UPDATE notes SET deleted_at=? WHERE id=?", longAgo, old.ID); err != nil {
		t.Fatalf("backdate: %v", err)
	}

	if err := s.purgeTrash(time.Now().Add(-trashRetention)); err != nil {
		t.Fatalf("purge: %v", err)
	}

	if ids := noteIDs(mustGetTrash(t, s)); len(ids) != 1 || ids[0] != recent.ID {
		t.Errorf("trash = %v, want only %d", ids, recent.ID)
	}
	if ids := noteIDs(mustGetNotes(t, s)); len(ids) != 1 || ids[0] != live.ID {
		t.Errorf("notes = %v, want only %d", ids, live.ID)
	}
}

func TestReopenKeepsNotes(t *testing.T) {
	// opening the same file twice runs migrate twice, which must not fail
	// or lose data
	path := filepath.Join(t.TempDir(), "test.db")
	s, err := open(path)
	if err != nil {
		t.Fatalf("first open: %v", err)
	}
	n, err := s.SaveNote(Note{Title: "survives"})
	if err != nil {
		t.Fatalf("save: %v", err)
	}
	s.Close()

	s, err = open(path)
	if err != nil {
		t.Fatalf("second open: %v", err)
	}
	defer s.Close()
	if ids := noteIDs(mustGetNotes(t, s)); len(ids) != 1 || ids[0] != n.ID {
		t.Errorf("notes after reopen = %v, want only %d", ids, n.ID)
	}
}

func TestOpenUpgradesV1Database(t *testing.T) {
	// a v1.0.0 database has no deleted_at column; its notes must still show
	// up after the upgrade, and not land in the trash
	path := filepath.Join(t.TempDir(), "v1.db")
	raw, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatalf("open raw: %v", err)
	}
	_, err = raw.Exec(`
		CREATE TABLE notes (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			title      TEXT NOT NULL DEFAULT '',
			content    TEXT NOT NULL DEFAULT '',
			note_type  TEXT NOT NULL DEFAULT 'plain',
			metadata   TEXT NOT NULL DEFAULT '{}',
			pinned     INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL
		);
		INSERT INTO notes (title, created_at, updated_at)
		VALUES ('from v1', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');
	`)
	raw.Close()
	if err != nil {
		t.Fatalf("create v1 schema: %v", err)
	}

	s, err := open(path)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer s.Close()

	notes := mustGetNotes(t, s)
	if len(notes) != 1 || notes[0].Title != "from v1" {
		t.Errorf("notes = %+v, want the v1 note", notes)
	}
	if trash := mustGetTrash(t, s); len(trash) != 0 {
		t.Errorf("trash = %v, want empty", noteIDs(trash))
	}
}
