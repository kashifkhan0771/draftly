// Metadata shapes for each template type

export interface MeetingMeta {
  attendees: string[];
  agenda: string;
  actionItems: string;
  owners: string[];
}

export interface ChangelogMeta {
  version: string;
  releaseDate: string;
  newFeatures: string;
  bugFixes: string;
}

export interface WorkflowMeta {
  steps: string;
  roles: string[];
  checklist: { text: string; done: boolean }[];
}

export interface EmailMeta {
  to: string[];
  subject: string;
}

export interface BookMeta {
  chapterTitle: string;
  sceneNotes: string;
  wordCountGoal: number;
}

export interface DatasheetMeta {
  columns: string[];
  rows: string[][];
}

export function parseMeta<T>(json: string, fallback: T): T {
  try {
    const parsed = JSON.parse(json);
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}
