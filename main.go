package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
)

//go:embed all:frontend/dist
var assets embed.FS

// windowTitle is the window title. Dev builds set it to "Draftly Dev" through
// -ldflags so they are easy to tell apart from the installed app.
var windowTitle = "Draftly"

func main() {
	app := NewApp()

	err := wails.Run(&options.App{
		Title:  windowTitle,
		Width:  1200,
		Height: 800,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 15, G: 15, B: 16, A: 1}, // #0F0F10 fox dark
		// Wails turns the macOS green (zoom) button off unless Mac options are
		// set, so pass empty ones to keep it on like in other apps.
		Mac:        &mac.Options{},
		OnStartup:  app.startup,
		OnShutdown: app.shutdown,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
