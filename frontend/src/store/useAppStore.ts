import { create } from "zustand";

export interface Note {
  id: number;
  title: string;
  content: string;
  noteType: string;
  metadata: string;
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
  deletedAt: string; // empty when not in the trash
}

// Drafts live only in client state (negative IDs) until they have content.
export function isDraft(note: Note): boolean {
  return note.id < 0;
}

function isEmptyContent(content: string): boolean {
  return content.replace(/<[^>]*>/g, "").trim() === "";
}

function isEmptyMetadata(metadata: string): boolean {
  try {
    const parsed = JSON.parse(metadata);
    if (!parsed || typeof parsed !== "object") return true;
    return Object.values(parsed).every((v) => {
      if (Array.isArray(v)) return v.length === 0;
      if (typeof v === "string") return v.trim() === "";
      if (typeof v === "number") return v === 0;
      return v === null || v === undefined || v === false;
    });
  } catch {
    return true;
  }
}

export function isEmptyNote(note: Note): boolean {
  return (
    note.title.trim() === "" &&
    isEmptyContent(note.content) &&
    isEmptyMetadata(note.metadata)
  );
}

export interface Settings {
  theme: string;
  fontSize: number;
  claudeApiKey: string;
  geminiApiKey: string;
  grokApiKey: string;
  groqApiKey: string;
  preferredAiProvider: string;
  gdriveRefreshToken: string;
  gdriveConnected: boolean;
}

export type View = "home" | "editor" | "pinboard" | "allnotes" | "settings" | "about" | "trash";

export interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

interface AppState {
  notes: Note[];
  activeNoteId: number | null;
  settings: Settings;
  searchQuery: string;
  view: View;
  // Bumps when the user opens/switches a note; stable across draft→saved transitions.
  // Used as the TipTap editor's re-init key so cursor position survives the first save.
  editorSessionKey: number;
  confirmDialog: ConfirmDialogState | null;

  setNotes: (notes: Note[]) => void;
  setActiveNoteId: (id: number | null) => void;
  setSettings: (settings: Settings) => void;
  setSearchQuery: (query: string) => void;
  setView: (view: View) => void;
  updateNote: (note: Note) => void;
  addNote: (note: Note) => void;
  removeNote: (id: number) => void;
  replaceNote: (oldId: number, newNote: Note) => void;
  discardEmptyDraft: () => void;
  showConfirm: (opts: ConfirmDialogState) => void;
  hideConfirm: () => void;
}

// Drop any empty draft (unsaved, no content) — called when focus leaves editor.
function dropEmptyDraft(state: AppState): Partial<AppState> {
  const active = state.notes.find((n) => n.id === state.activeNoteId);
  if (!active || !isDraft(active) || !isEmptyNote(active)) return {};
  return {
    notes: state.notes.filter((n) => n.id !== active.id),
    activeNoteId: null,
  };
}

export const useAppStore = create<AppState>((set) => ({
  notes: [],
  activeNoteId: null,
  settings: { theme: "fox", fontSize: 16, claudeApiKey: "", geminiApiKey: "", grokApiKey: "", groqApiKey: "", preferredAiProvider: "", gdriveRefreshToken: "", gdriveConnected: false },
  searchQuery: "",
  view: "home",
  editorSessionKey: 0,
  confirmDialog: null,

  setNotes: (notes) => set({ notes }),
  setActiveNoteId: (id) =>
    set((state) => ({
      ...dropEmptyDraft(state),
      activeNoteId: id,
      view: "editor",
      editorSessionKey: state.editorSessionKey + 1,
    })),
  setSettings: (settings) => set({ settings }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setView: (view) =>
    set((state) => (view === "editor" ? { view } : { ...dropEmptyDraft(state), view })),

  updateNote: (note) =>
    set((state) => ({
      notes: state.notes.map((n) => (n.id === note.id ? note : n)),
    })),

  addNote: (note) =>
    set((state) => ({
      ...dropEmptyDraft(state),
      notes: [note, ...state.notes.filter((n) => !(isDraft(n) && isEmptyNote(n)))],
      activeNoteId: note.id,
      view: "editor",
      editorSessionKey: state.editorSessionKey + 1,
    })),

  removeNote: (id) =>
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
      activeNoteId: state.activeNoteId === id ? null : state.activeNoteId,
      view: state.activeNoteId === id ? "home" : state.view,
    })),

  replaceNote: (oldId, newNote) =>
    set((state) => ({
      notes: state.notes.map((n) => (n.id === oldId ? newNote : n)),
      activeNoteId: state.activeNoteId === oldId ? newNote.id : state.activeNoteId,
    })),

  discardEmptyDraft: () => set((state) => dropEmptyDraft(state)),

  showConfirm: (opts) => set({ confirmDialog: opts }),
  hideConfirm: () => set({ confirmDialog: null }),
}));
