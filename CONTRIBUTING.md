# Contributing to Draftly

Thanks for helping out! Bug reports, ideas, and pull requests are all welcome.

## Reporting bugs and asking for features

Open an [issue](https://github.com/kashifkhan0771/draftly/issues) using the bug report or feature request template. For bugs, include your Draftly version (shown on the **About** page) and your OS.

## Development setup

Draftly is a [Wails v2](https://wails.io) app: a Go backend with a React + TypeScript frontend.

### Requirements

| Tool | Version | Notes |
|---|---|---|
| Go | 1.21+ | The `make` commands switch to Go 1.25 automatically (Go 1.27 breaks Wails binding generation). |
| Node.js | 20+ | |
| Wails CLI | v2.12.0 | `go install github.com/wailsapp/wails/v2/cmd/wails@v2.12.0` |
| Linux libs | — | `sudo apt install libgtk-3-dev libwebkit2gtk-4.1-dev` |
| macOS tools | — | `xcode-select --install` |

Run `wails doctor` to check your setup.

### Run and build

```bash
git clone https://github.com/kashifkhan0771/draftly.git
cd draftly

make dev            # live-reload dev mode
make build-dev      # test build "draftly-dev", keeps its notes apart from your installed Draftly

make build-linux    # Linux -> build/bin/draftly
make build-deb      # Linux -> build/bin/draftly_VERSION_amd64.deb (needs imagemagick + dpkg)
make build-mac      # macOS -> build/bin/draftly.app (universal)
```

### Google Drive backup in local builds

The Google OAuth credentials Drive backup needs are not in the source code. Without them, everything works except Drive backup, which shows "Google Drive backup isn't set up in this build".

To enable it, create a **Desktop app** OAuth client in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials) with the Google Drive API turned on, then:

```bash
export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="your-client-secret"
make dev
```

The `make` commands pass these into the build. Never commit them.

### Project layout

```
draftly/
├── main.go, app.go        Wails entry point and the methods the UI calls
├── backend/
│   ├── ai/                Claude, Gemini, Grok and Groq clients
│   ├── db/                SQLite storage for notes and settings
│   ├── desktop/           Linux launcher entry and icon setup
│   ├── export/            PDF export
│   ├── gdrive/            Google Drive backup and restore
│   └── updater/           App version and GitHub update check
├── frontend/              React + TypeScript UI (Vite, Tailwind, Tiptap)
│   └── wailsjs/           Generated Go bindings (rebuilt by wails build/dev)
├── scripts/build-deb.sh   Linux .deb packaging
└── releases/              Release notes, one file per version
```

## Making a change

1. Fork the repo and create a branch from `main`.
2. Run the app with `make dev` and check your change works.
3. Before opening a pull request, make sure these pass:

   ```bash
   wails build          # builds the frontend, regenerates bindings, builds the app
   go vet ./...         # on Linux: go vet -tags webkit2_41 ./...
   go test ./...        # on Linux: go test -tags webkit2_41 ./...
   ```

4. Open a pull request. CI builds it on Linux, macOS and Windows.

## Guidelines

- Keep changes small and focused — one fix or feature per pull request.
- Match the style of the code around your change. Run `gofmt` on Go files.
- If you change a method in `app.go`, commit the regenerated files in `frontend/wailsjs/`.
- Leave `AppVersion` and release notes alone; they are updated when releasing (see below).

## Releasing (maintainer)

Releases are published by hand from GitHub Actions. Pushing or merging to `main` never ships a release.

One-time setup: add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` as repository secrets (**Settings → Secrets and variables → Actions**). Without them the release still builds, but Drive backup is off.

1. Bump `AppVersion` in `backend/updater/updater.go`.
2. Add `releases/vX.Y.Z.md` with a `## What's new` section. That section becomes the release notes.
3. Merge to `main`.
4. Go to **Actions → Release → Run workflow**.

The workflow builds Linux (`.deb` + tarball), macOS (universal `.app`) and Windows, then creates the `vX.Y.Z` tag and GitHub Release. If that version was already released, it stops without building.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
