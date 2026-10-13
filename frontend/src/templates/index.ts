export { MeetingFields } from "./MeetingFields";
export { ChangelogFields } from "./ChangelogFields";
export { WorkflowFields } from "./WorkflowFields";
export { EmailFields } from "./EmailFields";
export { BookFields } from "./BookFields";
export { LedgerFields } from "./LedgerFields";

export const NOTE_TYPES = [
  { id: "plain", label: "Plain Note", icon: "FileText" },
  { id: "meeting", label: "Meeting Notes", icon: "Users" },
  { id: "changelog", label: "Release / Changelog", icon: "Tag" },
  { id: "workflow", label: "Workflow / SOP", icon: "ListChecks" },
  { id: "email", label: "Email Draft", icon: "Mail" },
  { id: "book", label: "Book Draft", icon: "BookOpen" },
  { id: "ledger", label: "Ledger", icon: "Table" },
] as const;

export type NoteTypeId = (typeof NOTE_TYPES)[number]["id"];
