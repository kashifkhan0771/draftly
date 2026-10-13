package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/kashifkhan0771/draftly/backend/ai"
	"github.com/kashifkhan0771/draftly/backend/db"
	"github.com/kashifkhan0771/draftly/backend/desktop"
	"github.com/kashifkhan0771/draftly/backend/export"
	"github.com/kashifkhan0771/draftly/backend/gdrive"
	"github.com/kashifkhan0771/draftly/backend/updater"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct holds the application state and is bound to the frontend. #draftly
type App struct {
	ctx   context.Context
	store *db.Store
}

// NewApp creates a new App application struct.
func NewApp() *App {
	return &App{}
}

// startup is called by Wails when the app starts.
// It initializes the SQLite database and installs desktop integration. #draftly
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	store, err := db.New()
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	a.store = store

	// Install desktop entry + icon on Linux (no-op on other platforms)
	go desktop.Install()
}

// shutdown is called by Wails when the app is closing.
func (a *App) shutdown(ctx context.Context) {
	if a.store != nil {
		a.store.Close()
	}
}

// --- Methods exposed to the frontend via Wails bindings ---

// GetNotes returns all notes.
func (a *App) GetNotes() ([]db.Note, error) {
	return a.store.GetNotes()
}

// SaveNote creates or updates a note.
func (a *App) SaveNote(note db.Note) (db.Note, error) {
	return a.store.SaveNote(note)
}

// DeleteNote removes a note by ID.
func (a *App) DeleteNote(id int64) error {
	return a.store.DeleteNote(id)
}

// GetSettings returns the app settings.
func (a *App) GetSettings() (db.Settings, error) {
	return a.store.GetSettings()
}

// SaveSettings updates the app settings.
func (a *App) SaveSettings(settings db.Settings) error {
	return a.store.SaveSettings(settings)
}

// ExportNotePDF exports a note to PDF, showing a save dialog. #draftly
func (a *App) ExportNotePDF(noteID int64) error {
	notes, err := a.store.GetNotes()
	if err != nil {
		return err
	}

	var note *db.Note
	for i := range notes {
		if notes[i].ID == noteID {
			note = &notes[i]
			break
		}
	}
	if note == nil {
		return fmt.Errorf("note not found")
	}

	title := note.Title
	if title == "" {
		title = "Untitled"
	}

	pdfBytes, err := export.ToPDF(title, note.Content)
	if err != nil {
		return err
	}

	savePath, err := wailsRuntime.SaveFileDialog(a.ctx, wailsRuntime.SaveDialogOptions{
		DefaultFilename: title + ".pdf",
		Filters: []wailsRuntime.FileFilter{
			{DisplayName: "PDF Files", Pattern: "*.pdf"},
		},
	})
	if err != nil {
		return fmt.Errorf("save dialog: %w", err)
	}
	if savePath == "" {
		return nil // User cancelled
	}

	return os.WriteFile(savePath, pdfBytes, 0o644)
}

// --- AI methods ---

// AIRewrite rewrites text using the configured AI provider. #draftly
func (a *App) AIRewrite(text, tone string) (string, error) {
	provider, err := a.aiProvider()
	if err != nil {
		return "", err
	}
	return provider.Rewrite(a.ctx, text, tone)
}

// AISummarize summarizes text using the configured AI provider. #draftly
func (a *App) AISummarize(text string) (string, error) {
	provider, err := a.aiProvider()
	if err != nil {
		return "", err
	}
	return provider.Summarize(a.ctx, text)
}

// aiProvider returns the configured AI provider from settings. #draftly
func (a *App) aiProvider() (ai.Provider, error) {
	settings, err := a.store.GetSettings()
	if err != nil {
		return nil, fmt.Errorf("load settings: %w", err)
	}

	// Look up the key for the preferred provider.
	name := settings.PreferredAIProvider
	var apiKey string
	switch name {
	case "claude":
		apiKey = settings.ClaudeAPIKey
	case "gemini":
		apiKey = settings.GeminiAPIKey
	case "grok":
		apiKey = settings.GrokAPIKey
	case "groq":
		apiKey = settings.GroqAPIKey
	}

	// If the preferred provider has no key (unset or stale), auto-detect
	// whichever provider actually has a key configured.
	if apiKey == "" {
		if settings.ClaudeAPIKey != "" {
			name, apiKey = "claude", settings.ClaudeAPIKey
		} else if settings.GeminiAPIKey != "" {
			name, apiKey = "gemini", settings.GeminiAPIKey
		} else if settings.GrokAPIKey != "" {
			name, apiKey = "grok", settings.GrokAPIKey
		} else if settings.GroqAPIKey != "" {
			name, apiKey = "groq", settings.GroqAPIKey
		} else {
			return nil, fmt.Errorf("no AI API key configured — add one in Settings")
		}
	}

	return ai.NewProvider(name, apiKey)
}

// --- Google Drive methods ---

// GDriveStartAuth initiates OAuth2 flow — opens the browser and returns the
// auth URL so the frontend can also display it for manual copy/paste. #draftly
func (a *App) GDriveStartAuth() (string, error) {
	client := gdrive.NewClient()

	authURL, err := client.StartAuthFlow()
	if err != nil {
		return "", fmt.Errorf("start auth flow: %w", err)
	}

	// Open default browser automatically; user can also paste the URL manually.
	wailsRuntime.BrowserOpenURL(a.ctx, authURL)

	// Wait for callback in background, then save token
	go func() {
		token, err := client.WaitForToken()
		if err != nil {
			wailsRuntime.EventsEmit(a.ctx, "gdrive:auth-error", err.Error())
			return
		}

		settings, err := a.store.GetSettings()
		if err != nil {
			wailsRuntime.EventsEmit(a.ctx, "gdrive:auth-error", err.Error())
			return
		}

		settings.GDriveRefreshToken = token.RefreshToken
		settings.GDriveConnected = true
		if err := a.store.SaveSettings(settings); err != nil {
			wailsRuntime.EventsEmit(a.ctx, "gdrive:auth-error", err.Error())
			return
		}

		wailsRuntime.EventsEmit(a.ctx, "gdrive:auth-complete")
	}()

	return authURL, nil
}

// GDriveDisconnect clears Google Drive tokens. #draftly
func (a *App) GDriveDisconnect() error {
	settings, err := a.store.GetSettings()
	if err != nil {
		return err
	}
	settings.GDriveRefreshToken = ""
	settings.GDriveConnected = false
	return a.store.SaveSettings(settings)
}

// GDriveBackup exports all notes to Google Drive. #draftly
func (a *App) GDriveBackup() error {
	settings, err := a.store.GetSettings()
	if err != nil {
		return err
	}
	if settings.GDriveRefreshToken == "" {
		return fmt.Errorf("Google Drive not connected")
	}

	token, err := gdrive.TokenFromRefresh(settings.GDriveRefreshToken)
	if err != nil {
		return fmt.Errorf("refresh token: %w", err)
	}

	notes, err := a.store.GetNotes()
	if err != nil {
		return err
	}

	return gdrive.Backup(a.ctx, token, notes)
}

// GDriveListBackups returns available backup files. #draftly
func (a *App) GDriveListBackups() ([]gdrive.BackupFile, error) {
	settings, err := a.store.GetSettings()
	if err != nil {
		return nil, err
	}
	if settings.GDriveRefreshToken == "" {
		return nil, fmt.Errorf("Google Drive not connected")
	}

	token, err := gdrive.TokenFromRefresh(settings.GDriveRefreshToken)
	if err != nil {
		return nil, fmt.Errorf("refresh token: %w", err)
	}

	return gdrive.ListBackups(a.ctx, token)
}

// GDriveRestore imports notes from a backup file. Returns count of imported notes. #draftly
func (a *App) GDriveRestore(fileID string) (int, error) {
	settings, err := a.store.GetSettings()
	if err != nil {
		return 0, err
	}
	if settings.GDriveRefreshToken == "" {
		return 0, fmt.Errorf("Google Drive not connected")
	}

	token, err := gdrive.TokenFromRefresh(settings.GDriveRefreshToken)
	if err != nil {
		return 0, fmt.Errorf("refresh token: %w", err)
	}

	notes, err := gdrive.Restore(a.ctx, token, fileID)
	if err != nil {
		return 0, err
	}

	// Insert as new notes (ID=0) to avoid conflicts
	for _, n := range notes {
		n.ID = 0
		if _, err := a.store.SaveNote(n); err != nil {
			return 0, fmt.Errorf("import note: %w", err)
		}
	}

	wailsRuntime.EventsEmit(a.ctx, "gdrive:restore-complete")
	return len(notes), nil
}

// --- Update methods ---

// CheckForUpdate queries GitHub for a newer release. #draftly
func (a *App) CheckForUpdate() (*updater.UpdateInfo, error) {
	return updater.CheckForUpdate()
}

// GetVersion returns the current app version (from updater.AppVersion). #draftly
func (a *App) GetVersion() string {
	return updater.AppVersion
}

// OpenReleasePage opens the GitHub releases page in the browser. #draftly
func (a *App) OpenReleasePage() {
	wailsRuntime.BrowserOpenURL(a.ctx, updater.GetReleasesPageURL())
}
