//go:build !linux

package desktop

// Install is a no-op on non-Linux platforms.
// Windows and macOS handle app icons via the binary/bundle.
func Install() {}
