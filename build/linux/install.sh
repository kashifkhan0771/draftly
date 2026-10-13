#!/bin/bash
# Install Draftly on Linux
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BIN_DIR="$HOME/.local/bin"
ICON_DIR="$HOME/.local/share/icons/hicolor/512x512/apps"
DESKTOP_DIR="$HOME/.local/share/applications"

mkdir -p "$BIN_DIR" "$ICON_DIR" "$DESKTOP_DIR"

# Copy binary
cp "$SCRIPT_DIR/../bin/draftly" "$BIN_DIR/draftly"
chmod +x "$BIN_DIR/draftly"

# Copy icon
cp "$SCRIPT_DIR/../../build/appicon.png" "$ICON_DIR/draftly.png"

# Install desktop entry
sed "s|Exec=draftly|Exec=$BIN_DIR/draftly|" "$SCRIPT_DIR/draftly.desktop" > "$DESKTOP_DIR/draftly.desktop"

# Refresh caches
update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
gtk-update-icon-cache "$HOME/.local/share/icons/hicolor/" 2>/dev/null || true

echo "Draftly installed! Search for 'Draftly' in your app launcher."
