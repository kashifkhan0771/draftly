import { useEffect, useCallback, useRef, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { Sidebar } from "@/components/Sidebar";
import { Editor } from "@/components/Editor";
import { HomePage } from "@/components/HomePage";
import { Pinboard } from "@/components/Pinboard";
import { AllNotes } from "@/components/AllNotes";
import { SettingsPanel } from "@/components/SettingsPanel";
import { AboutPage } from "@/components/AboutPage";
import { UpdateBanner } from "@/components/UpdateBanner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAppStore, isDraft, isEmptyNote, type Note } from "@/store/useAppStore";
import type { ThemeName } from "@/components/ThemeSelector";
import type { NoteTypeId } from "@/templates";
import {
  GetNotes,
  SaveNote,
  DeleteNote,
  GetSettings,
  SaveSettings,
  CheckForUpdate,
} from "../wailsjs/go/main/App";

function applyTheme(theme: string) {
  document.documentElement.setAttribute("data-theme", theme);
}

function App() {
  const notes = useAppStore((s) => s.notes);
  const activeNoteId = useAppStore((s) => s.activeNoteId);
  const settings = useAppStore((s) => s.settings);
  const view = useAppStore((s) => s.view);
  const setNotes = useAppStore((s) => s.setNotes);
  const setSettings = useAppStore((s) => s.setSettings);
  const addNote = useAppStore((s) => s.addNote);
  const removeNote = useAppStore((s) => s.removeNote);
  const updateNote = useAppStore((s) => s.updateNote);
  const replaceNote = useAppStore((s) => s.replaceNote);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const draftIdRef = useRef<number>(-1);
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);

  useEffect(() => {
    GetNotes().then((loaded) => {
      if (loaded) setNotes(loaded);
    });
    GetSettings().then((s) => {
      setSettings(s);
      applyTheme(s.theme);
    });
    // Check for updates silently on startup
    CheckForUpdate()
      .then((info) => {
        if (info.available) setUpdateAvailable(info.latestVer);
      })
      .catch(() => {}); // Silent fail — no network is fine
  }, []);

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  const saveSettingsToDb = useCallback(
    async (updated: typeof settings) => {
      setSettings(updated);
      try {
        await SaveSettings(updated);
      } catch (err) {
        console.error("Failed to save settings:", err);
      }
    },
    [setSettings]
  );

  const handleThemeChange = useCallback(
    (theme: ThemeName) => saveSettingsToDb({ ...settings, theme }),
    [settings, saveSettingsToDb]
  );

  const handleFontSizeChange = useCallback(
    (fontSize: number) => saveSettingsToDb({ ...settings, fontSize }),
    [settings, saveSettingsToDb]
  );

  // Create a new draft — lives in memory only until the user writes something.
  const createNote = useCallback(
    (type: NoteTypeId = "plain") => {
      const now = new Date().toISOString();
      const draft: Note = {
        id: draftIdRef.current--,
        title: "",
        content: "",
        noteType: type,
        metadata: "{}",
        createdAt: now,
        updatedAt: now,
        pinned: false,
      };
      addNote(draft);
    },
    [addNote]
  );

  const handleSave = useCallback(
    (note: Note) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      const draft = isDraft(note);
      if (draft && isEmptyNote(note)) return; // Don't persist empty drafts.

      saveTimerRef.current = setTimeout(async () => {
        try {
          const payload = draft ? { ...note, id: 0 } : note;
          const saved = await SaveNote(payload as any);
          if (draft) {
            replaceNote(note.id, saved);
          } else {
            updateNote(saved);
          }
        } catch (err) {
          console.error("Failed to save note:", err);
        }
      }, 500);
    },
    [updateNote, replaceNote]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      // Drafts never hit the DB — just drop locally.
      if (id < 0) {
        removeNote(id);
        return;
      }
      try {
        await DeleteNote(id);
        removeNote(id);
      } catch (err) {
        console.error("Failed to delete note:", err);
      }
    },
    [removeNote]
  );

  const activeNote = notes.find((n) => n.id === activeNoteId);

  function renderMain() {
    switch (view) {
      case "settings":
        return (
          <SettingsPanel
            onClose={() => useAppStore.getState().setView("home")}
            onThemeChange={handleThemeChange}
            onFontSizeChange={handleFontSizeChange}
            onSettingsChange={saveSettingsToDb}
          />
        );
      case "pinboard":
        return <Pinboard />;
      case "allnotes":
        return <AllNotes onNewNote={createNote} onDelete={handleDelete} />;
      case "about":
        return <AboutPage />;
      case "editor":
        if (activeNote) {
          return (
            <Editor
              note={activeNote}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          );
        }
        return <HomePage onNewNote={createNote} />;
      default:
        return <HomePage onNewNote={createNote} />;
    }
  }

  return (
    <div className="h-screen flex flex-col bg-th-bg">
      {updateAvailable && (
        <UpdateBanner latestVer={updateAvailable} />
      )}
      <TopNav onNewNote={() => createNote("plain")} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onDeleteNote={handleDelete} />
        <main className="flex-1 flex min-w-0 overflow-hidden">{renderMain()}</main>
      </div>
      <ConfirmDialog />
    </div>
  );
}

export default App;
