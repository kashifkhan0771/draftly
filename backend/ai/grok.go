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
	grokAPI   = "https://api.x.ai/v1/chat/completions"
	grokModel = "grok-3-mini-beta"
)

type grokProvider struct {
	apiKey string
}

type grokRequest struct {
	Model     string        `json:"model"`
	MaxTokens int           `json:"max_tokens"`
	Messages  []grokMessage `json:"messages"`
}

type grokMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type grokResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	// xAI returns "error" as either an object {message,code} or a plain string.
	Error json.RawMessage `json:"error"`
}

func (g *grokProvider) Rewrite(ctx context.Context, text, tone string) (string, error) {
	system := fmt.Sprintf(
		"You are a writing assistant. Rewrite the following text in a %s tone. "+
			"Return only the rewritten text, no explanations or preamble.", tone)
	return g.call(ctx, system, text)
}

func (g *grokProvider) Summarize(ctx context.Context, text string) (string, error) {
	system := "You are a writing assistant. Summarize the following text concisely. " +
		"Return only the summary, no explanations or preamble."
	return g.call(ctx, system, text)
}

func (g *grokProvider) call(ctx context.Context, system, userText string) (string, error) {
	body := grokRequest{
		Model:     grokModel,
		MaxTokens: 4096,
		Messages: []grokMessage{
			{Role: "system", Content: system},
			{Role: "user", Content: userText},
		},
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return "", fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, grokAPI, bytes.NewReader(payload))
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+g.apiKey)

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

	var result grokResponse
	if err := json.Unmarshal(data, &result); err != nil {
		return "", fmt.Errorf("parse response: %w", err)
	}

	if len(result.Error) > 0 && string(result.Error) != "null" {
		// Try object form: {"message":"...","code":"..."}
		var errObj struct {
			Message string `json:"message"`
		}
		if json.Unmarshal(result.Error, &errObj) == nil && errObj.Message != "" {
			return "", friendlyGrokError(resp.StatusCode, errObj.Message)
		}
		// Fall back to plain string form: "some error"
		var errStr string
		if json.Unmarshal(result.Error, &errStr) == nil && errStr != "" {
			return "", friendlyGrokError(resp.StatusCode, errStr)
		}
		return "", fmt.Errorf("Grok API error: %s", string(result.Error))
	}
	if len(result.Choices) == 0 || result.Choices[0].Message.Content == "" {
		return "", fmt.Errorf("empty response from Grok")
	}

	return result.Choices[0].Message.Content, nil
}

func friendlyGrokError(status int, msg string) error {
	switch {
	case status == http.StatusUnauthorized || strings.Contains(msg, "invalid_api_key"):
		return fmt.Errorf("invalid Grok API key — check Settings")
	case status == http.StatusTooManyRequests:
		return fmt.Errorf("Grok rate limit reached — wait a moment and try again")
	case status >= 500:
		return fmt.Errorf("Grok service error (HTTP %d) — try again in a moment", status)
	default:
		return fmt.Errorf("Grok API error: %s", msg)
	}
}
