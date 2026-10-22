package updater

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
)

const (
	// AppVersion is the current app version. Update this on each release.
	AppVersion = "1.1.0"

	releasesRepo = "kashifkhan0771/draftly"
	latestURL    = "https://api.github.com/repos/" + releasesRepo + "/releases/latest"
	releasesPage = "https://github.com/" + releasesRepo + "/releases/latest"
)

// UpdateInfo holds the result of an update check. #draftly
type UpdateInfo struct {
	Available   bool   `json:"available"`
	CurrentVer  string `json:"currentVer"`
	LatestVer   string `json:"latestVer"`
	ReleaseURL  string `json:"releaseURL"`
	ReleaseBody string `json:"releaseBody"`
}

type ghRelease struct {
	TagName string `json:"tag_name"`
	HTMLURL string `json:"html_url"`
	Body    string `json:"body"`
}

// CheckForUpdate queries GitHub releases API and compares with current version. #draftly
func CheckForUpdate() (*UpdateInfo, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(latestURL)
	if err != nil {
		return nil, fmt.Errorf("check update: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API returned %d: %s", resp.StatusCode, string(body))
	}

	var release ghRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return nil, fmt.Errorf("parse release: %w", err)
	}

	latestVer := strings.TrimPrefix(release.TagName, "v")
	available := semverGreater(latestVer, AppVersion)

	return &UpdateInfo{
		Available:   available,
		CurrentVer:  AppVersion,
		LatestVer:   latestVer,
		ReleaseURL:  release.HTMLURL,
		ReleaseBody: release.Body,
	}, nil
}

// GetReleasesPageURL returns the URL to the latest releases page.
func GetReleasesPageURL() string {
	return releasesPage
}

// semverGreater returns true if version a is greater than version b.
// Compares major.minor.patch numerically to avoid lexicographic ordering bugs.
func semverGreater(a, b string) bool {
	pa := parseSemver(a)
	pb := parseSemver(b)
	for i := range pa {
		if pa[i] != pb[i] {
			return pa[i] > pb[i]
		}
	}
	return false
}

func parseSemver(v string) [3]int {
	parts := strings.SplitN(v, ".", 3)
	var out [3]int
	for i, p := range parts {
		if i >= 3 {
			break
		}
		out[i], _ = strconv.Atoi(p)
	}
	return out
}
