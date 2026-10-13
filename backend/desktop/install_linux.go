//go:build linux

package desktop

import (
	_ "embed"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

//go:embed icon.png
var iconPNG []byte

const desktopTemplate = `[Desktop Entry]
Name=Draftly
Comment=Local-first. Privacy-native. Beautifully simple.
Exec=%s
Icon=draftly
Type=Application
Categories=Office;TextEditor;
StartupWMClass=draftly
`

// Install sets up the .desktop entry and icon for Linux so the app shows
// in the launcher with the correct icon. Safe to call on every startup —
// it only writes if files are missing or the binary path changed. #draftly
func Install() {
	home, err := os.UserHomeDir()
	if err != nil {
		return
	}

	exePath, err := os.Executable()
	if err != nil {
		return
	}
	exePath, _ = filepath.EvalSymlinks(exePath)

	iconDir := filepath.Join(home, ".local", "share", "icons", "hicolor", "512x512", "apps")
	desktopDir := filepath.Join(home, ".local", "share", "applications")

	os.MkdirAll(iconDir, 0o755)
	os.MkdirAll(desktopDir, 0o755)

	// Write icon if missing
	iconPath := filepath.Join(iconDir, "draftly.png")
	if _, err := os.Stat(iconPath); os.IsNotExist(err) {
		_ = os.WriteFile(iconPath, iconPNG, 0o644)
	}

	// Write/update desktop entry if missing or the existing entry points at a
	// binary that no longer exists. If the entry already points at a working
	// binary (e.g. the installed copy in /usr/bin) we leave it alone — this
	// prevents `wails dev` runs from clobbering the installed launcher with
	// a path to a temp build binary that disappears on exit. #draftly
	desktopPath := filepath.Join(desktopDir, "draftly.desktop")
	desktopContent := fmt.Sprintf(desktopTemplate, exePath)
	needsWrite := true
	if existing, err := os.ReadFile(desktopPath); err == nil {
		if existingExec := parseExecPath(string(existing)); existingExec != "" {
			if info, err := os.Stat(existingExec); err == nil && !info.IsDir() {
				needsWrite = false
			}
		}
	}
	if needsWrite {
		_ = os.WriteFile(desktopPath, []byte(desktopContent), 0o644)
		// Refresh caches silently
		exec.Command("update-desktop-database", desktopDir).Run()
		exec.Command("gtk-update-icon-cache", filepath.Join(home, ".local", "share", "icons", "hicolor")).Run()
	}
}

// parseExecPath extracts the Exec= value from a .desktop file's contents.
// Returns "" if no Exec line is found.
func parseExecPath(content string) string {
	for _, line := range strings.Split(content, "\n") {
		if strings.HasPrefix(line, "Exec=") {
			return strings.TrimSpace(strings.TrimPrefix(line, "Exec="))
		}
	}
	return ""
}
