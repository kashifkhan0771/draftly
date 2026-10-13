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
	groqAPI   = "https://api.groq.com/openai/v1/chat/completions"
	groqModel = "llama-3.3-70b-versatile"
)

type groqProvider struct {
	apiKey string
}

// groqRequest/groqResponse follow the OpenAI-compatible schema Groq exposes. #draftly
type groqRequest struct {
	Model     string        `json:"model"`
	MaxTokens int           `json:"max_tokens"`
	Messages  []groqMessage `json:"messages"`
}

type groqMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type groqResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
		Type    string `json:"type"`
		Code    string `json:"code"`
	} `json:"error"`
}

func (g *groqProvider) Rewrite(ctx context.Context, text, tone string) (string, error) {
	system := fmt.Sprintf(
		"You are a writing assistant. Rewrite the following text in a %s tone. "+
			"Return only the rewritten text, no explanations or preamble.", tone)
	return g.call(ctx, system, text)
}

func (g *groqProvider) Summarize(ctx context.Context, text string) (string, error) {
	system := "You are a writing assistant. Summarize the following text concisely. " +
		"Return only the summary, no explanations or preamble."
	return g.call(ctx, system, text)
}

func (g *groqProvider) call(ctx context.Context, system, userText string) (string, error) {
	body := groqRequest{
		Model:     groqModel,
		MaxTokens: 4096,
		Messages: []groqMessage{
			{Role: "system", Content: system},
			{Role: "user", Content: userText},
		},
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return "", fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, groqAPI, bytes.NewReader(payload))
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

	var result groqResponse
	if err := json.Unmarshal(data, &result); err != nil {
		return "", fmt.Errorf("parse response: %w", err)
	}

	if result.Error != nil {
		return "", friendlyGroqError(resp.StatusCode, result.Error.Message)
	}
	if len(result.Choices) == 0 || result.Choices[0].Message.Content == "" {
		return "", fmt.Errorf("empty response from Groq")
	}

	return result.Choices[0].Message.Content, nil
}

func friendlyGroqError(status int, msg string) error {
	switch {
	case status == http.StatusUnauthorized || strings.Contains(msg, "invalid_api_key"):
		return fmt.Errorf("invalid Groq API key — check Settings")
	case status == http.StatusTooManyRequests || strings.Contains(msg, "rate_limit"):
		return fmt.Errorf("Groq rate limit reached — wait a moment and try again")
	case status >= 500:
		return fmt.Errorf("Groq service error (HTTP %d) — try again in a moment", status)
	default:
		return fmt.Errorf("Groq API error: %s", msg)
	}
}
