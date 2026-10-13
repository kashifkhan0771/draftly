package db

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"time"

	_ "modernc.org/sqlite" // Pure Go SQLite driver #draftly
)

// Store wraps the SQLite database connection and provides CRUD operations.
type Store struct {
	db *sql.DB
}

// New opens (or creates) the SQLite database in the user's config directory
// and runs migrations. Returns a ready-to-use Store. #draftly
func New() (*Store, error) {
	dbPath, err := dbFilePath()
	if err != nil {
		return nil, fmt.Errorf("resolve db path: %w", err)
	}

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	// Enable WAL mode for better concurrent read performance #draftly
	if _, err := db.Exec("PRAGMA journal_mode=WAL"); err != nil {
		return nil, fmt.Errorf("set WAL mode: %w", err)
	}

	s := &Store{db: db}
	if err := s.migrate(); err != nil {
		return nil, fmt.Errorf("migrate: %w", err)
	}

	return s, nil
}

// Close closes the underlying database connection.
func (s *Store) Close() error {
	return s.db.Close()
}

// dbFilePath returns the path to the SQLite database file,
// creating the parent directory if needed. #draftly
func dbFilePath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(configDir, "draftly")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	return filepath.Join(dir, "draftly.db"), nil
}

// migrate creates the tables if they don't already exist. #draftly
func (s *Store) migrate() error {
	schema := `
	CREATE TABLE IF NOT EXISTS notes (
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		title      TEXT NOT NULL DEFAULT '',
		content    TEXT NOT NULL DEFAULT '',
		note_type  TEXT NOT NULL DEFAULT 'plain',
		metadata   TEXT NOT NULL DEFAULT '{}',
		pinned     INTEGER NOT NULL DEFAULT 0,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS settings (
		id        INTEGER PRIMARY KEY CHECK (id = 1),
		theme     TEXT NOT NULL DEFAULT 'light',
		font_size INTEGER NOT NULL DEFAULT 16
	);

	INSERT OR IGNORE INTO settings (id, theme, font_size) VALUES (1, 'fox', 16);
	`
	if _, err := s.db.Exec(schema); err != nil {
		return err
	}

	// Phase 3 migrations: add columns for AI keys and Google Drive. #draftly
	// ALTER TABLE ADD COLUMN is idempotent — duplicate column errors are ignored.
	for _, col := range []string{
		"claude_api_key TEXT NOT NULL DEFAULT ''",
		"gemini_api_key TEXT NOT NULL DEFAULT ''",
		"grok_api_key TEXT NOT NULL DEFAULT ''",
		"groq_api_key TEXT NOT NULL DEFAULT ''",
		"preferred_ai_provider TEXT NOT NULL DEFAULT ''",
		"gdrive_refresh_token TEXT NOT NULL DEFAULT ''",
		"gdrive_connected INTEGER NOT NULL DEFAULT 0",
	} {
		_, _ = s.db.Exec("ALTER TABLE settings ADD COLUMN " + col)
	}

	return nil
}

// --- Note CRUD ---

// GetNotes returns all notes ordered by pinned first, then most recently updated.
func (s *Store) GetNotes() ([]Note, error) {
	rows, err := s.db.Query(`
		SELECT id, title, content, note_type, metadata, pinned, created_at, updated_at
		FROM notes
		ORDER BY pinned DESC, updated_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notes []Note
	for rows.Next() {
		var n Note
		var pinned int
		if err := rows.Scan(&n.ID, &n.Title, &n.Content, &n.NoteType, &n.Metadata, &pinned, &n.CreatedAt, &n.UpdatedAt); err != nil {
			return nil, err
		}
		n.Pinned = pinned == 1
		notes = append(notes, n)
	}
	return notes, rows.Err()
}

// SaveNote creates or updates a note. If ID is 0, a new note is created.
// Returns the saved note with its ID and timestamps set. #draftly
func (s *Store) SaveNote(n Note) (Note, error) {
	now := time.Now().UTC().Format(time.RFC3339)

	if n.ID == 0 {
		// Insert new note
		n.CreatedAt = now
		n.UpdatedAt = now
		if n.NoteType == "" {
			n.NoteType = NoteTypePlain
		}
		if n.Metadata == "" {
			n.Metadata = "{}"
		}

		result, err := s.db.Exec(`
			INSERT INTO notes (title, content, note_type, metadata, pinned, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`, n.Title, n.Content, n.NoteType, n.Metadata, boolToInt(n.Pinned), n.CreatedAt, n.UpdatedAt)
		if err != nil {
			return n, err
		}
		n.ID, _ = result.LastInsertId()
	} else {
		// Update existing note
		n.UpdatedAt = now
		_, err := s.db.Exec(`
			UPDATE notes SET title=?, content=?, note_type=?, metadata=?, pinned=?, updated_at=?
			WHERE id=?
		`, n.Title, n.Content, n.NoteType, n.Metadata, boolToInt(n.Pinned), n.UpdatedAt, n.ID)
		if err != nil {
			return n, err
		}
	}
	return n, nil
}

// DeleteNote removes a note by ID.
func (s *Store) DeleteNote(id int64) error {
	_, err := s.db.Exec("DELETE FROM notes WHERE id=?", id)
	return err
}

// --- Settings CRUD ---

// GetSettings returns the app settings (single row, id=1).
func (s *Store) GetSettings() (Settings, error) {
	var set Settings
	var gdriveConnected int
	err := s.db.QueryRow(`
		SELECT theme, font_size, claude_api_key, gemini_api_key, grok_api_key, groq_api_key, preferred_ai_provider,
		       gdrive_refresh_token, gdrive_connected
		FROM settings WHERE id=1
	`).Scan(&set.Theme, &set.FontSize, &set.ClaudeAPIKey, &set.GeminiAPIKey, &set.GrokAPIKey, &set.GroqAPIKey,
		&set.PreferredAIProvider, &set.GDriveRefreshToken, &gdriveConnected)
	set.GDriveConnected = gdriveConnected == 1
	return set, err
}

// SaveSettings updates the app settings.
func (s *Store) SaveSettings(set Settings) error {
	_, err := s.db.Exec(`
		UPDATE settings SET theme=?, font_size=?, claude_api_key=?, gemini_api_key=?, grok_api_key=?, groq_api_key=?,
		       preferred_ai_provider=?, gdrive_refresh_token=?, gdrive_connected=?
		WHERE id=1
	`, set.Theme, set.FontSize, set.ClaudeAPIKey, set.GeminiAPIKey, set.GrokAPIKey, set.GroqAPIKey,
		set.PreferredAIProvider, set.GDriveRefreshToken, boolToInt(set.GDriveConnected))
	return err
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
