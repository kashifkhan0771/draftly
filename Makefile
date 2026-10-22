TAGS ?= webkit2_41

# Wails binding generation breaks on newer Go releases (1.27), so pin the
# Go version from go.mod. Go downloads it automatically if it's missing.
export GOTOOLCHAIN := go1.25.0

# Use wails from PATH, or from Go's bin folder if it isn't on PATH yet.
WAILS := $(shell command -v wails 2>/dev/null || echo "$$(go env GOPATH)/bin/wails")

# Google Drive backup needs OAuth credentials, which are not in the source.
# Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your shell to enable it.
GDRIVE_PKG := github.com/kashifkhan0771/draftly/backend/gdrive
LDFLAGS := -X $(GDRIVE_PKG).clientID=$(GOOGLE_CLIENT_ID) -X $(GDRIVE_PKG).clientSecret=$(GOOGLE_CLIENT_SECRET)

# Dev builds are named draftly-dev and keep their notes in a separate
# "draftly-dev" folder, so testing never touches the installed app's notes.
DEV_LDFLAGS := $(LDFLAGS) -X github.com/kashifkhan0771/draftly/backend/db.DataDirName=draftly-dev -X 'main.windowTitle=Draftly Dev'

.PHONY: dev build build-dev build-linux build-deb build-windows build-mac

dev:
	$(WAILS) dev -tags $(TAGS) -ldflags "$(DEV_LDFLAGS)"

build:
	$(WAILS) build -tags $(TAGS) -ldflags "$(LDFLAGS)"

# On macOS wails ignores -o for the .app bundle, so rename it and give it its
# own bundle ID and name. Otherwise macOS treats it as the installed Draftly.
build-dev:
	$(WAILS) build -tags $(TAGS) -o draftly-dev -ldflags "$(DEV_LDFLAGS)"
	@if [ -d build/bin/draftly.app ]; then \
		rm -rf build/bin/draftly-dev.app; \
		mv build/bin/draftly.app build/bin/draftly-dev.app; \
		/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier com.wails.draftly-dev" \
			-c "Set :CFBundleName Draftly Dev" build/bin/draftly-dev.app/Contents/Info.plist; \
		codesign --force --deep -s - build/bin/draftly-dev.app; \
		echo "Built build/bin/draftly-dev.app"; \
	fi

build-linux:
	$(WAILS) build -tags webkit2_41 -platform linux/amd64 -ldflags "$(LDFLAGS)"

# .deb package (Linux only, needs imagemagick + dpkg)
build-deb:
	bash scripts/build-deb.sh

build-windows:
	$(WAILS) build -platform windows/amd64 -ldflags "$(LDFLAGS)"

build-mac:
	$(WAILS) build -platform darwin/universal -ldflags "$(LDFLAGS)"
