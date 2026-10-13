package ai

import (
	"context"
	"fmt"
)

// Supported tone options for rewriting. #draftly
const (
	ToneProfessional = "professional"
	ToneCasual       = "casual"
	ToneFormal       = "formal"
	ToneFriendly     = "friendly"
	ToneConcise      = "concise"
	ToneCreative     = "creative"
)

// Provider defines the interface for AI text operations. #draftly
type Provider interface {
	Rewrite(ctx context.Context, text string, tone string) (string, error)
	Summarize(ctx context.Context, text string) (string, error)
}

// NewProvider returns a Provider for the given name ("claude", "gemini", "grok", or "groq"). #draftly
func NewProvider(name, apiKey string) (Provider, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("API key is required")
	}
	switch name {
	case "claude":
		return &claudeProvider{apiKey: apiKey}, nil
	case "gemini":
		return &geminiProvider{apiKey: apiKey}, nil
	case "grok":
		return &grokProvider{apiKey: apiKey}, nil
	case "groq":
		return &groqProvider{apiKey: apiKey}, nil
	default:
		return nil, fmt.Errorf("unknown AI provider: %s", name)
	}
}
