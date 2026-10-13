package gdrive

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"time"

	"golang.org/x/oauth2"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/option"

	"github.com/kashifkhan0771/draftly/backend/db"
)

const (
	backupFolder = "Draftly Backups"
	backupPrefix = "draftly-backup-"
)

// BackupFile represents a backup file listed from Google Drive. #draftly
type BackupFile struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	CreatedAt string `json:"createdAt"`
	Size      int64  `json:"size"`
}

// backupPayload is the JSON structure stored in each backup file. #draftly
type backupPayload struct {
	Version    int       `json:"version"`
	ExportedAt string   `json:"exportedAt"`
	Notes      []db.Note `json:"notes"`
}

// AuthResult holds the token and any redirect info for the OAuth flow.
type AuthResult struct {
	Token *oauth2.Token
	Err   error
}

// Client wraps Google Drive operations. #draftly
type Client struct {
	tokenCh     chan AuthResult
	callbackSrv *http.Server
}

// NewClient creates a new Google Drive client.
func NewClient() *Client {
	return &Client{
		tokenCh: make(chan AuthResult, 1),
	}
}

// StartAuthFlow starts a localhost server, returns the OAuth URL to open. #draftly
func (c *Client) StartAuthFlow() (string, error) {
	// Builds made without Google credentials can't connect to Drive
	if oauthConfig.ClientID == "" || oauthConfig.ClientSecret == "" {
		return "", fmt.Errorf("Google Drive backup isn't set up in this build")
	}

	// Generate state for CSRF protection
	stateBytes := make([]byte, 16)
	if _, err := rand.Read(stateBytes); err != nil {
		return "", fmt.Errorf("generate state: %w", err)
	}
	state := base64.URLEncoding.EncodeToString(stateBytes)

	// Start a listener on a random port
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return "", fmt.Errorf("start listener: %w", err)
	}
	port := listener.Addr().(*net.TCPAddr).Port
	redirectURL := fmt.Sprintf("http://127.0.0.1:%d/callback", port)

	cfg := *oauthConfig
	cfg.RedirectURL = redirectURL

	mux := http.NewServeMux()
	mux.HandleFunc("/callback", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("state") != state {
			c.tokenCh <- AuthResult{Err: fmt.Errorf("state mismatch")}
			fmt.Fprintln(w, "Error: state mismatch. You can close this tab.")
			return
		}
		code := r.URL.Query().Get("code")
		if code == "" {
			c.tokenCh <- AuthResult{Err: fmt.Errorf("no code in callback")}
			fmt.Fprintln(w, "Error: no authorization code. You can close this tab.")
			return
		}

		token, err := cfg.Exchange(context.Background(), code)
		if err != nil {
			c.tokenCh <- AuthResult{Err: fmt.Errorf("exchange code: %w", err)}
			fmt.Fprintln(w, "Error exchanging code. You can close this tab.")
			return
		}

		c.tokenCh <- AuthResult{Token: token}
		fmt.Fprintln(w, "Success! You can close this tab and return to Draftly.")
	})

	c.callbackSrv = &http.Server{Handler: mux}
	go func() {
		_ = c.callbackSrv.Serve(listener)
	}()

	// prompt=select_account forces the account chooser even when one account is
	// already signed in. prompt=consent ensures a refresh token is always issued.
	authURL := cfg.AuthCodeURL(state,
		oauth2.AccessTypeOffline,
		oauth2.SetAuthURLParam("prompt", "select_account consent"),
	)
	return authURL, nil
}

// WaitForToken blocks until the OAuth callback is received. #draftly
func (c *Client) WaitForToken() (*oauth2.Token, error) {
	result := <-c.tokenCh

	// Shut down callback server
	if c.callbackSrv != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		_ = c.callbackSrv.Shutdown(ctx)
	}

	return result.Token, result.Err
}

// TokenFromRefresh creates a token source from a refresh token and returns a fresh access token. #draftly
func TokenFromRefresh(refreshToken string) (*oauth2.Token, error) {
	token := &oauth2.Token{RefreshToken: refreshToken}
	src := oauthConfig.TokenSource(context.Background(), token)
	return src.Token()
}

// Backup uploads all notes as a JSON file to Google Drive. #draftly
func Backup(ctx context.Context, token *oauth2.Token, notes []db.Note) error {
	srv, err := driveService(ctx, token)
	if err != nil {
		return err
	}

	folderID, err := ensureFolder(srv)
	if err != nil {
		return fmt.Errorf("ensure folder: %w", err)
	}

	payload := backupPayload{
		Version:    1,
		ExportedAt: time.Now().UTC().Format(time.RFC3339),
		Notes:      notes,
	}
	data, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal backup: %w", err)
	}

	name := backupPrefix + time.Now().UTC().Format("2006-01-02T150405Z") + ".json"
	file := &drive.File{
		Name:     name,
		Parents:  []string{folderID},
		MimeType: "application/json",
	}

	_, err = srv.Files.Create(file).
		Media(bytes.NewReader(data)).
		Do()
	if err != nil {
		return fmt.Errorf("upload backup: %w", err)
	}

	return nil
}

// ListBackups returns available backup files from Google Drive. #draftly
func ListBackups(ctx context.Context, token *oauth2.Token) ([]BackupFile, error) {
	srv, err := driveService(ctx, token)
	if err != nil {
		return nil, err
	}

	folderID, err := findFolder(srv)
	if err != nil {
		return nil, err
	}
	if folderID == "" {
		return nil, nil // No backups folder yet
	}

	query := fmt.Sprintf("'%s' in parents and trashed=false", folderID)
	result, err := srv.Files.List().
		Q(query).
		OrderBy("createdTime desc").
		Fields("files(id,name,createdTime,size)").
		Do()
	if err != nil {
		return nil, fmt.Errorf("list backups: %w", err)
	}

	var files []BackupFile
	for _, f := range result.Files {
		files = append(files, BackupFile{
			ID:        f.Id,
			Name:      f.Name,
			CreatedAt: f.CreatedTime,
			Size:      f.Size,
		})
	}
	return files, nil
}

// Restore downloads and parses a backup file, returning the notes. #draftly
func Restore(ctx context.Context, token *oauth2.Token, fileID string) ([]db.Note, error) {
	srv, err := driveService(ctx, token)
	if err != nil {
		return nil, err
	}

	resp, err := srv.Files.Get(fileID).Download()
	if err != nil {
		return nil, fmt.Errorf("download backup: %w", err)
	}
	defer resp.Body.Close()

	var payload backupPayload
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("parse backup: %w", err)
	}

	return payload.Notes, nil
}

// --- helpers ---

func driveService(ctx context.Context, token *oauth2.Token) (*drive.Service, error) {
	src := oauthConfig.TokenSource(ctx, token)
	srv, err := drive.NewService(ctx, option.WithTokenSource(src))
	if err != nil {
		return nil, fmt.Errorf("create drive service: %w", err)
	}
	return srv, nil
}

func ensureFolder(srv *drive.Service) (string, error) {
	id, err := findFolder(srv)
	if err != nil {
		return "", err
	}
	if id != "" {
		return id, nil
	}

	// Create the folder
	folder := &drive.File{
		Name:     backupFolder,
		MimeType: "application/vnd.google-apps.folder",
	}
	created, err := srv.Files.Create(folder).Fields("id").Do()
	if err != nil {
		return "", fmt.Errorf("create folder: %w", err)
	}
	return created.Id, nil
}

func findFolder(srv *drive.Service) (string, error) {
	query := fmt.Sprintf("name='%s' and mimeType='application/vnd.google-apps.folder' and trashed=false", backupFolder)
	result, err := srv.Files.List().Q(query).Fields("files(id)").Do()
	if err != nil {
		return "", fmt.Errorf("find folder: %w", err)
	}
	if len(result.Files) == 0 {
		return "", nil
	}
	return result.Files[0].Id, nil
}
