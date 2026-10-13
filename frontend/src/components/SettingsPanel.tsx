import { useState, useEffect, useCallback } from "react";
import {
  X, Minus, Plus, Eye, EyeOff,
  Palette, Type, Brain, CloudUpload, CloudDownload,
  Loader2, Check, Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeSelector, type ThemeName } from "@/components/ThemeSelector";
import { useAppStore, type Settings } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import {
  GDriveStartAuth,
  GDriveDisconnect,
  GDriveBackup,
  GDriveListBackups,
  GDriveRestore,
  GetNotes,
  GetSettings,
} from "../../wailsjs/go/main/App";
import { EventsOn } from "../../wailsjs/runtime/runtime";

type SettingsTab = "themes" | "editor" | "ai" | "backup";

const TABS: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "themes", label: "Themes", icon: Palette },
  { id: "editor", label: "Editor", icon: Type },
  { id: "ai", label: "AI", icon: Brain },
  { id: "backup", label: "Backup", icon: CloudUpload },
];

interface SettingsPanelProps {
  onClose: () => void;
  onThemeChange: (theme: ThemeName) => void;
  onFontSizeChange: (size: number) => void;
  onSettingsChange: (settings: Settings) => void;
}

export function SettingsPanel({ onClose, onThemeChange, onFontSizeChange, onSettingsChange }: SettingsPanelProps) {
  const settings = useAppStore((s) => s.settings);
  const [activeTab, setActiveTab] = useState<SettingsTab>("themes");

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-th-bg">
      {/* Header with tabs */}
      <div className="border-b border-th-border">
        <div className="flex items-center justify-between px-6 pt-3 pb-0">
          <h2 className="text-lg font-semibold text-th-text">Settings</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4 text-th-text-muted" />
          </Button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-6 mt-3">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2",
                activeTab === id
                  ? "border-th-accent text-th-accent bg-th-accent/5"
                  : "border-transparent text-th-text-muted hover:text-th-text hover:bg-th-surface/30"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-6">
        {activeTab === "themes" && (
          <ThemesTab activeTheme={settings.theme as ThemeName} onSelect={onThemeChange} />
        )}
        {activeTab === "editor" && (
          <EditorTab settings={settings} onFontSizeChange={onFontSizeChange} />
        )}
        {activeTab === "ai" && (
          <AITab settings={settings} updateSetting={updateSetting} />
        )}
        {activeTab === "backup" && (
          <BackupTab />
        )}
      </div>
    </div>
  );
}

/* ── Themes Tab ── */

function ThemesTab({ activeTheme, onSelect }: { activeTheme: ThemeName; onSelect: (t: ThemeName) => void }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-th-text mb-1">Theme</h3>
      <p className="text-xs text-th-text-muted mb-4">
        Choose your visual theme
      </p>
      <ThemeSelector activeTheme={activeTheme} onSelect={onSelect} />
    </div>
  );
}

/* ── Editor Tab ── */

function EditorTab({ settings, onFontSizeChange }: { settings: Settings; onFontSizeChange: (s: number) => void }) {
  const adjustSize = (delta: number) => {
    const next = Math.min(24, Math.max(12, settings.fontSize + delta));
    onFontSizeChange(next);
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-th-text mb-1">Editor Font Size</h3>
      <p className="text-xs text-th-text-muted mb-4">
        Adjust the text size in the editor (12px - 24px)
      </p>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => adjustSize(-1)}
          disabled={settings.fontSize <= 12}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-th-text tabular-nums w-12 text-center">
          {settings.fontSize}px
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => adjustSize(1)}
          disabled={settings.fontSize >= 24}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <span
          className="text-th-text-muted ml-4"
          style={{ fontSize: `${settings.fontSize}px` }}
        >
          Preview text
        </span>
      </div>
    </div>
  );
}

/* ── AI Tab ── */

function AITab({
  settings,
  updateSetting,
}: {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}) {
  const [showClaude, setShowClaude] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [showGrok,   setShowGrok]   = useState(false);
  const [showGroq,   setShowGroq]   = useState(false);

  const configuredProviders = [
    settings.claudeApiKey  && "claude",
    settings.geminiApiKey  && "gemini",
    settings.grokApiKey    && "grok",
    settings.groqApiKey    && "groq",
  ].filter(Boolean) as string[];

  return (
    <div>
      <h3 className="text-sm font-semibold text-th-text mb-1">AI Assistant</h3>
      <p className="text-xs text-th-text-muted mb-4">
        Add API keys to enable AI rewrite and summarize in the editor.
      </p>

      <div className="space-y-5">
        {/* Claude */}
        <div>
          <label className="text-xs font-medium text-th-text mb-1.5 block">Claude API Key</label>
          <div className="relative">
            <Input
              type={showClaude ? "text" : "password"}
              value={settings.claudeApiKey}
              onChange={(e) => updateSetting("claudeApiKey", e.target.value)}
              placeholder="sk-ant-..."
              className="pr-9 bg-th-sidebar"
            />
            <button
              type="button"
              onClick={() => setShowClaude(!showClaude)}
              className="absolute right-2.5 top-2.5 text-th-text-muted hover:text-th-text"
            >
              {showClaude ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Gemini */}
        <div>
          <label className="text-xs font-medium text-th-text mb-1.5 block">Gemini API Key</label>
          <div className="relative">
            <Input
              type={showGemini ? "text" : "password"}
              value={settings.geminiApiKey}
              onChange={(e) => updateSetting("geminiApiKey", e.target.value)}
              placeholder="AIza..."
              className="pr-9 bg-th-sidebar"
            />
            <button
              type="button"
              onClick={() => setShowGemini(!showGemini)}
              className="absolute right-2.5 top-2.5 text-th-text-muted hover:text-th-text"
            >
              {showGemini ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Grok */}
        <div>
          <label className="text-xs font-medium text-th-text mb-1.5 block">Grok API Key</label>
          <div className="relative">
            <Input
              type={showGrok ? "text" : "password"}
              value={settings.grokApiKey}
              onChange={(e) => updateSetting("grokApiKey", e.target.value)}
              placeholder="xai-..."
              className="pr-9 bg-th-sidebar"
            />
            <button
              type="button"
              onClick={() => setShowGrok(!showGrok)}
              className="absolute right-2.5 top-2.5 text-th-text-muted hover:text-th-text"
            >
              {showGrok ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Groq */}
        <div>
          <label className="text-xs font-medium text-th-text mb-1.5 block">Groq API Key</label>
          <div className="relative">
            <Input
              type={showGroq ? "text" : "password"}
              value={settings.groqApiKey}
              onChange={(e) => updateSetting("groqApiKey", e.target.value)}
              placeholder="gsk_..."
              className="pr-9 bg-th-sidebar"
            />
            <button
              type="button"
              onClick={() => setShowGroq(!showGroq)}
              className="absolute right-2.5 top-2.5 text-th-text-muted hover:text-th-text"
            >
              {showGroq ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Active provider — only shown when more than one key is configured */}
        {configuredProviders.length > 1 && (
          <div>
            <label className="text-xs font-medium text-th-text mb-2 block">Active Provider</label>
            <div className="flex gap-2">
              {configuredProviders.map((p) => (
                <button
                  key={p}
                  onClick={() => updateSetting("preferredAiProvider", p)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize",
                    settings.preferredAiProvider === p
                      ? "border-th-accent bg-th-accent/10 text-th-accent"
                      : "border-th-border text-th-text-muted hover:border-th-accent/30"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Backup Tab ── */

interface BackupFileItem {
  id: string;
  name: string;
  createdAt: string;
  size: number;
}

function BackupTab() {
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const setNotes = useAppStore((s) => s.setNotes);
  const [backups, setBackups] = useState<BackupFileItem[]>([]);
  const [showBackups, setShowBackups] = useState(false);
  const [loading, setLoading] = useState<"auth" | "backup" | "restore" | "list" | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);

  useEffect(() => {
    const offComplete = EventsOn("gdrive:auth-complete", async () => {
      const s = await GetSettings();
      setSettings(s);
      setLoading(null);
      setAuthUrl(null);
      setMessage({ type: "success", text: "Google Drive connected!" });
    });
    const offError = EventsOn("gdrive:auth-error", (err: string) => {
      setLoading(null);
      setAuthUrl(null);
      setMessage({ type: "error", text: err });
    });
    const offRestore = EventsOn("gdrive:restore-complete", async () => {
      const notes = await GetNotes();
      if (notes) setNotes(notes);
    });
    return () => {
      offComplete();
      offError();
      offRestore();
    };
  }, [setSettings, setNotes]);

  const handleConnect = useCallback(async () => {
    setLoading("auth");
    setMessage(null);
    setAuthUrl(null);
    try {
      const url = await GDriveStartAuth();
      if (url) setAuthUrl(url);
    } catch (err: any) {
      setLoading(null);
      setMessage({ type: "error", text: err?.message || String(err) });
    }
  }, []);

  const handleCopyUrl = useCallback(() => {
    if (!authUrl) return;
    navigator.clipboard.writeText(authUrl).then(() => {
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    });
  }, [authUrl]);

  const handleDisconnect = useCallback(async () => {
    try {
      await GDriveDisconnect();
      const s = await GetSettings();
      setSettings(s);
      setMessage({ type: "success", text: "Disconnected" });
      setShowBackups(false);
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || String(err) });
    }
  }, [setSettings]);

  const handleBackup = useCallback(async () => {
    setLoading("backup");
    setMessage(null);
    try {
      await GDriveBackup();
      setMessage({ type: "success", text: "Backup uploaded successfully!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || String(err) });
    } finally {
      setLoading(null);
    }
  }, []);

  const handleListBackups = useCallback(async () => {
    setLoading("list");
    setMessage(null);
    try {
      const files = await GDriveListBackups();
      setBackups(files || []);
      setShowBackups(true);
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || String(err) });
    } finally {
      setLoading(null);
    }
  }, []);

  const handleRestore = useCallback(async (fileID: string) => {
    setLoading("restore");
    setMessage(null);
    try {
      const count = await GDriveRestore(fileID);
      setMessage({ type: "success", text: `Restored ${count} notes` });
      setShowBackups(false);
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || String(err) });
    } finally {
      setLoading(null);
    }
  }, []);

  return (
    <div>
      <h3 className="text-sm font-semibold text-th-text mb-1">Google Drive Backup</h3>
      <p className="text-xs text-th-text-muted mb-4">
        Back up and restore your notes to Google Drive
      </p>

      {message && (
        <div className={cn(
          "text-xs px-3 py-2 rounded-lg mb-3",
          message.type === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
        )}>
          {message.text}
        </div>
      )}

      {!settings.gdriveConnected ? (
        <div className="space-y-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleConnect}
            disabled={loading === "auth"}
            className="text-xs"
          >
            {loading === "auth" ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Waiting for authorization...</>
            ) : (
              <><CloudUpload className="h-3.5 w-3.5 mr-1.5" /> Connect Google Drive</>
            )}
          </Button>

          {authUrl && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-th-text-muted">
                Browser not opening? Copy and paste this URL manually:
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 rounded-md border border-th-border bg-th-surface/50 px-2 py-1.5">
                  <p className="text-[10px] text-th-text-muted truncate font-mono">{authUrl}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyUrl}
                  className="text-xs shrink-0 h-7"
                >
                  {urlCopied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-green-400" />
            <span className="text-xs text-green-400 font-medium">Connected</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackup}
              disabled={loading !== null}
              className="text-xs"
            >
              {loading === "backup" ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <CloudUpload className="h-3.5 w-3.5 mr-1.5" />
              )}
              Backup Now
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleListBackups}
              disabled={loading !== null}
              className="text-xs"
            >
              {loading === "list" ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <CloudDownload className="h-3.5 w-3.5 mr-1.5" />
              )}
              Restore
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              className="text-xs text-th-text-muted"
            >
              <Unlink className="h-3.5 w-3.5 mr-1.5" /> Disconnect
            </Button>
          </div>

          {showBackups && (
            <div className="border border-th-border rounded-lg overflow-hidden">
              {backups.length === 0 ? (
                <p className="text-xs text-th-text-muted p-3 text-center">No backups found</p>
              ) : (
                <div className="max-h-48 overflow-auto">
                  {backups.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => handleRestore(b.id)}
                      disabled={loading === "restore"}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-th-surface/50 border-b border-th-border last:border-b-0 transition-colors"
                    >
                      <div>
                        <span className="text-xs text-th-text block">{b.name}</span>
                        <span className="text-[10px] text-th-text-muted">
                          {new Date(b.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {loading === "restore" ? (
                        <Loader2 className="h-3 w-3 animate-spin text-th-text-muted" />
                      ) : (
                        <CloudDownload className="h-3 w-3 text-th-text-muted" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
