#!/usr/bin/env bash
# scripts/build-deb.sh — Build a .deb package for Draftly (Linux amd64)
#
# Usage:
#   bash scripts/build-deb.sh [VERSION]
#
# If VERSION is omitted it is read from backend/updater/updater.go.
#
# Prerequisites (all available in the CI environment after apt setup):
#   go, wails, node/npm  — to compile the Wails binary
#   imagemagick          — to resize the app icon (apt install imagemagick)
#   dpkg-deb             — to assemble the package  (apt install dpkg)

set -euo pipefail

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
info()  { echo "  [build-deb] $*"; }
die()   { echo "  [build-deb] ERROR: $*" >&2; exit 1; }

check_tool() {
  command -v "$1" >/dev/null 2>&1 || die "'$1' is required but not found. $2"
}

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BINARY_SRC="$REPO_ROOT/build/bin/draftly"
ICON_SRC="$REPO_ROOT/build/appicon.png"
DESKTOP_SRC="$REPO_ROOT/build/linux/draftly.desktop"
OUT_DIR="$REPO_ROOT/build/bin"

# ---------------------------------------------------------------------------
# Version
# ---------------------------------------------------------------------------
if [[ -n "${1:-}" ]]; then
  VERSION="$1"
else
  VERSION=$(grep -oP 'AppVersion\s*=\s*"\K[^"]+' "$REPO_ROOT/backend/updater/updater.go")
fi
[[ -n "$VERSION" ]] || die "Could not determine VERSION."

ARCH="amd64"
PKG_NAME="draftly_${VERSION}_${ARCH}"
STAGING="$REPO_ROOT/build/deb-staging/$PKG_NAME"

info "Package : $PKG_NAME"
info "Staging : $STAGING"
info "Output  : $OUT_DIR/${PKG_NAME}.deb"

# ---------------------------------------------------------------------------
# Dependency checks
# ---------------------------------------------------------------------------
check_tool convert  "Install with: sudo apt install imagemagick"
check_tool dpkg-deb "Install with: sudo apt install dpkg"

# ---------------------------------------------------------------------------
# Build the Wails binary (skipped when the binary already exists, e.g. in CI
# after an earlier wails build step, or when iterating locally)
# ---------------------------------------------------------------------------
if [[ ! -f "$BINARY_SRC" ]]; then
  info "Binary not found — building Wails app..."
  check_tool wails "Install with: go install github.com/wailsapp/wails/v2/cmd/wails@latest"
  check_tool npm   "Install Node.js from https://nodejs.org"
  cd "$REPO_ROOT/frontend" && npm install && cd "$REPO_ROOT"
  wails build -platform linux/amd64 -tags webkit2_41
  info "Wails build complete."
else
  info "Binary found — skipping Wails build."
fi

[[ -f "$BINARY_SRC" ]] || die "Binary still missing after build: $BINARY_SRC"

# ---------------------------------------------------------------------------
# Clean and create staging tree
# ---------------------------------------------------------------------------
rm -rf "$REPO_ROOT/build/deb-staging"

# FHS layout
USR_BIN="$STAGING/usr/bin"
APPS_DIR="$STAGING/usr/share/applications"
DEBIAN_DIR="$STAGING/DEBIAN"

mkdir -p "$USR_BIN" "$APPS_DIR" "$DEBIAN_DIR"
for SIZE in 16 32 48 128 256; do
  mkdir -p "$STAGING/usr/share/icons/hicolor/${SIZE}x${SIZE}/apps"
done

# ---------------------------------------------------------------------------
# Binary
# ---------------------------------------------------------------------------
cp "$BINARY_SRC" "$USR_BIN/draftly"
chmod 755 "$USR_BIN/draftly"
info "Installed binary."

# ---------------------------------------------------------------------------
# Icons  (resize from 512×512 source PNG)
# ---------------------------------------------------------------------------
for SIZE in 16 32 48 128 256; do
  convert "$ICON_SRC" -resize "${SIZE}x${SIZE}" \
    "$STAGING/usr/share/icons/hicolor/${SIZE}x${SIZE}/apps/draftly.png"
done
info "Installed icons (16 32 48 128 256 px)."

# ---------------------------------------------------------------------------
# .desktop file
# The source file uses a bare 'Exec=draftly'; for the system package we want
# the absolute path so the binary is found regardless of PATH.
# ---------------------------------------------------------------------------
sed 's|^Exec=.*|Exec=/usr/bin/draftly|' "$DESKTOP_SRC" \
  > "$APPS_DIR/draftly.desktop"
# Ensure the entry carries the MimeType hint so file managers can associate it
grep -q '^MimeType=' "$APPS_DIR/draftly.desktop" || \
  echo 'MimeType=text/plain;' >> "$APPS_DIR/draftly.desktop"
info "Installed .desktop file."

# ---------------------------------------------------------------------------
# DEBIAN/control
# Installed-Size is calculated in KiB from the usr/ tree (dpkg convention).
# Runtime deps match what 'ldd build/bin/draftly' reports:
#   libgtk-3.so.0            -> libgtk-3-0
#   libwebkit2gtk-4.1.so.0   -> libwebkit2gtk-4.1-0   (built with -tags webkit2_41)
#   libjavascriptcoregtk-4.1 -> pulled in by libwebkit2gtk-4.1-0
# ---------------------------------------------------------------------------
INSTALLED_KB=$(du -sk "$STAGING/usr" | cut -f1)

cat > "$DEBIAN_DIR/control" <<EOF
Package: draftly
Version: ${VERSION}
Architecture: ${ARCH}
Maintainer: Kashif Khan <kashifkhan0771@gmail.com>
Installed-Size: ${INSTALLED_KB}
Depends: libgtk-3-0, libwebkit2gtk-4.1-0
Section: utils
Priority: optional
Homepage: https://github.com/kashifkhan0771/draftly
Description: Local-first private note-taking app
 Draftly is a beautiful, privacy-native desktop note-taking app.
 Your notes stay on your machine, always. Features include structured
 templates, AI rewrite/summarise, Google Drive backup, and PDF export.
EOF
info "Written DEBIAN/control (Installed-Size: ${INSTALLED_KB} KiB)."

# ---------------------------------------------------------------------------
# DEBIAN/postinst  — refresh icon and desktop caches after install/upgrade
# ---------------------------------------------------------------------------
cat > "$DEBIAN_DIR/postinst" <<'POSTINST'
#!/bin/sh
set -e
case "$1" in
    configure)
        # Refresh the hicolor icon cache so the app icon appears immediately
        if command -v update-icon-caches >/dev/null 2>&1; then
            update-icon-caches /usr/share/icons/hicolor
        elif command -v gtk-update-icon-cache >/dev/null 2>&1; then
            gtk-update-icon-cache -f -t /usr/share/icons/hicolor
        fi
        # Rebuild the desktop file index so Draftly appears in app menus
        if command -v update-desktop-database >/dev/null 2>&1; then
            update-desktop-database /usr/share/applications
        fi
        ;;
esac
exit 0
POSTINST
chmod 755 "$DEBIAN_DIR/postinst"
info "Written DEBIAN/postinst."

# ---------------------------------------------------------------------------
# Assemble the .deb
# ---------------------------------------------------------------------------
mkdir -p "$OUT_DIR"
DEB_OUT="$OUT_DIR/${PKG_NAME}.deb"
dpkg-deb --build --root-owner-group "$STAGING" "$DEB_OUT"

# ---------------------------------------------------------------------------
# Cleanup staging
# ---------------------------------------------------------------------------
rm -rf "$REPO_ROOT/build/deb-staging"

info "Done → $DEB_OUT"
info "Verify with: dpkg-deb -I $DEB_OUT"
