package gdrive

import "golang.org/x/oauth2"

// Google OAuth credentials are not kept in the source code. Release builds
// fill them in at link time, for example:
//
//	-ldflags "-X github.com/kashifkhan0771/draftly/backend/gdrive.clientID=...
//	          -X github.com/kashifkhan0771/draftly/backend/gdrive.clientSecret=..."
//
// The Makefile and release workflow do this from the GOOGLE_CLIENT_ID and
// GOOGLE_CLIENT_SECRET environment variables. Without them, Drive backup is off.
var (
	clientID     string
	clientSecret string
)

// OAuth2 config for Google Drive access. #draftly
var oauthConfig = &oauth2.Config{
	ClientID:     clientID,
	ClientSecret: clientSecret,
	Scopes:       []string{"https://www.googleapis.com/auth/drive.file"},
	Endpoint: oauth2.Endpoint{
		AuthURL:  "https://accounts.google.com/o/oauth2/auth",
		TokenURL: "https://oauth2.googleapis.com/token",
	},
}
