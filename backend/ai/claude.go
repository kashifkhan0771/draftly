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

const (
	claudeAPI     = "https://api.anthropic.com/v1/messages"
	claudeModel   = "claude-sonnet-4-20250514"
	claudeVersion = "2023-06-01"
)

type claudeProvider struct {
	apiKey string
}

// claudeRequest / claudeResponse mirror the Anthropic Messages API. #draftly
type claudeRequest struct {
	Model     string          `json:"model"`
	MaxTokens int             `json:"max_tokens"`
	System    string          `json:"system,omitempty"`
	Messages  []claudeMessage `json:"messages"`
}

type claudeMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type claudeResponse struct {
	Content []struct {
		Text string `json:"text"`
	} `json:"content"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

func (c *claudeProvider) Rewrite(ctx context.Context, text, tone string) (string, error) {
	system := fmt.Sprintf(
		"You are a writing assistant. Rewrite the following text in a %s tone. "+
			"Return only the rewritten text, no explanations or preamble.", tone)
	return c.call(ctx, system, text)
}

func (c *claudeProvider) Summarize(ctx context.Context, text string) (string, error) {
	system := "You are a writing assistant. Summarize the following text concisely. " +
		"Return only the summary, no explanations or preamble."
	return c.call(ctx, system, text)
}

func (c *claudeProvider) call(ctx context.Context, system, userText string) (string, error) {
	body := claudeRequest{
		Model:     claudeModel,
		MaxTokens: 4096,
		System:    system,
		Messages: []claudeMessage{
			{Role: "user", Content: userText},
		},
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return "", fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, claudeAPI, bytes.NewReader(payload))
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("anthropic-version", claudeVersion)

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

	var result claudeResponse
	if err := json.Unmarshal(data, &result); err != nil {
		return "", fmt.Errorf("parse response: %w", err)
	}

	if result.Error != nil {
		return "", friendlyClaudeError(resp.StatusCode, result.Error.Message)
	}
	if len(result.Content) == 0 {
		return "", fmt.Errorf("empty response from Claude")
	}

	return result.Content[0].Text, nil
}

func friendlyClaudeError(status int, msg string) error {
	switch {
	case status == http.StatusUnauthorized || strings.Contains(msg, "authentication_error"):
		return fmt.Errorf("invalid Claude API key — check Settings")
	case status == http.StatusTooManyRequests || strings.Contains(msg, "rate_limit_error"):
		return fmt.Errorf("Claude rate limit reached — wait a moment and try again")
	case status >= 500:
		return fmt.Errorf("Claude service error (HTTP %d) — try again in a moment", status)
	default:
		return fmt.Errorf("Claude API error: %s", msg)
	}
}
