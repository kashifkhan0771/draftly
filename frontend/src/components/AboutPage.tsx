import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrowserOpenURL } from "../../wailsjs/runtime/runtime";
import { GetVersion } from "../../wailsjs/go/main/App";
import logoImg from "@/assets/logo.png";

const GITHUB_URL = "https://github.com/kashifkhan0771";
const LINKEDIN_URL = "https://www.linkedin.com/in/kashif-khan-0771";
const SUPPORT_URL = "https://github.com/kashifkhan0771/draftly/issues";

export function AboutPage() {
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    GetVersion().then(setVersion).catch(() => setVersion(""));
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-th-bg">
      <div className="max-w-lg mx-auto w-full px-6 py-10">
        {/* Header with logo */}
        <div className="flex items-center gap-4 mb-8">
          <img src={logoImg} alt="Draftly" className="h-14 w-14" />
          <div>
            <h1 className="text-xl font-bold text-th-text">Draftly</h1>
            <p className="text-sm text-th-text-muted">Local-first. Privacy-native. Beautifully simple.</p>
          </div>
        </div>

        {/* App Info */}
        <div className="rounded-xl border border-th-border bg-th-surface/50 p-5 mb-6">
          <p className="text-sm text-th-text-muted mb-3">
            A beautiful, private note-taking app for your desktop. Your notes stay on your machine — always.
          </p>
          <p className="text-xs text-th-text-muted/70">
            {version ? `Version ${version}` : "Version —"}
          </p>
        </div>

        {/* Follow the Author */}
        <div className="rounded-xl border border-th-border bg-th-surface/50 p-5 mb-6">
          <h2 className="text-sm font-semibold text-th-text mb-4">Follow the Author</h2>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => BrowserOpenURL(GITHUB_URL)}
              className="text-xs border-th-border text-th-text hover:bg-th-accent/10 hover:text-th-accent"
            >
              <ExternalLink className="h-4 w-4 mr-1.5" />
              GitHub
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => BrowserOpenURL(LINKEDIN_URL)}
              className="text-xs border-th-border text-th-text hover:bg-th-accent/10 hover:text-th-accent"
            >
              <ExternalLink className="h-4 w-4 mr-1.5" />
              LinkedIn
            </Button>
          </div>
        </div>

        {/* Support */}
        <div className="rounded-xl border border-th-border bg-th-surface/50 p-5 mb-6">
          <h2 className="text-sm font-semibold text-th-text mb-1">Support</h2>
          <p className="text-xs text-th-text-muted mb-4">
            Found a bug or have a feature request? Open an issue on GitHub.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => BrowserOpenURL(SUPPORT_URL)}
            className="text-xs border-th-border text-th-text hover:bg-th-accent/10 hover:text-th-accent"
          >
            <ExternalLink className="h-4 w-4 mr-1.5" />
            Report a Bug / Request a Feature
          </Button>
        </div>
      </div>
    </div>
  );
}
