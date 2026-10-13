package db

// NoteType represents the kind of note/template
type NoteType string

const (
	NoteTypePlain     NoteType = "plain"
	NoteTypeMeeting   NoteType = "meeting"
	NoteTypeChangelog NoteType = "changelog"
	NoteTypeWorkflow  NoteType = "workflow"
	NoteTypeEmail     NoteType = "email"
	NoteTypeBook      NoteType = "book"
	NoteTypeLedger    NoteType = "ledger"
)

// Note represents a single note/document in the app
type Note struct {
	ID        int64    `json:"id"`
	Title     string   `json:"title"`
	Content   string   `json:"content"`   // TipTap JSON content
	NoteType  NoteType `json:"noteType"`  // template type
	Metadata  string   `json:"metadata"`  // JSON string for template-specific fields
	CreatedAt string   `json:"createdAt"` // ISO 8601
	UpdatedAt string   `json:"updatedAt"` // ISO 8601
	Pinned    bool     `json:"pinned"`
}

// Settings holds app-wide preferences
type Settings struct {
	Theme    string `json:"theme"`    // theme name (fox, raven, etc.)
	FontSize int    `json:"fontSize"` // editor font size in px

	// AI API Keys
	ClaudeAPIKey        string `json:"claudeApiKey"`
	GeminiAPIKey        string `json:"geminiApiKey"`
	GrokAPIKey          string `json:"grokApiKey"`
	GroqAPIKey          string `json:"groqApiKey"`
	PreferredAIProvider string `json:"preferredAiProvider"` // "claude" | "gemini" | "grok" | "groq" | ""

	// Google Drive OAuth2
	GDriveRefreshToken string `json:"gdriveRefreshToken"`
	GDriveConnected    bool   `json:"gdriveConnected"`
}
