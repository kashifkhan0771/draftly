package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const geminiAPI = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

type geminiProvider struct {
	apiKey string
}

// Gemini API request/response types. #draftly
type geminiRequest struct {
	SystemInstruction *geminiContent  `json:"systemInstruction,omitempty"`
	Contents          []geminiContent `json:"contents"`
}

type geminiContent struct {
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text string `json:"text"`
}

type geminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []geminiPart `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

func (g *geminiProvider) Rewrite(ctx context.Context, text, tone string) (string, error) {
	system := fmt.Sprintf(
		"You are a writing assistant. Rewrite the following text in a %s tone. "+
			"Return only the rewritten text, no explanations or preamble.", tone)
	return g.call(ctx, system, text)
}

func (g *geminiProvider) Summarize(ctx context.Context, text string) (string, error) {
	system := "You are a writing assistant. Summarize the following text concisely. " +
		"Return only the summary, no explanations or preamble."
	return g.call(ctx, system, text)
}

func (g *geminiProvider) call(ctx context.Context, system, userText string) (string, error) {
	body := geminiRequest{
		SystemInstruction: &geminiContent{
			Parts: []geminiPart{{Text: system}},
		},
		Contents: []geminiContent{
			{Parts: []geminiPart{{Text: userText}}},
		},
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return "", fmt.Errorf("marshal request: %w", err)
	}

	url := geminiAPI + "?key=" + g.apiKey
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("API call failed: %w", err)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read response: %w", err)
	}

	var result geminiResponse
	if err := json.Unmarshal(data, &result); err != nil {
		return "", fmt.Errorf("parse response: %w", err)
	}

	if result.Error != nil {
		return "", friendlyGeminiError(resp.StatusCode, result.Error.Message)
	}
	if len(result.Candidates) == 0 || len(result.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("empty response from Gemini")
	}

	return result.Candidates[0].Content.Parts[0].Text, nil
}

func friendlyGeminiError(status int, msg string) error {
	switch {
	case status == http.StatusUnauthorized || strings.Contains(msg, "API_KEY_INVALID"):
		return fmt.Errorf("invalid Gemini API key — check Settings")
	case status == http.StatusTooManyRequests || strings.Contains(msg, "Quota exceeded") || strings.Contains(msg, "RESOURCE_EXHAUSTED"):
		return fmt.Errorf("Gemini free-tier quota exceeded — upgrade your plan at https://ai.dev/rate-limit or switch to Claude in Settings")
	case status >= 500:
		return fmt.Errorf("Gemini service error (HTTP %d) — try again in a moment", status)
	default:
		return fmt.Errorf("Gemini API error: %s", msg)
	}
}
