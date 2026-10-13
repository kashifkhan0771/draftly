import { useState } from "react";
import {
  FileText,
  Users,
  Tag,
  ListChecks,
  Mail,
  BookOpen,
  Table,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { NOTE_TYPES, type NoteTypeId } from "@/templates";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Users,
  Tag,
  ListChecks,
  Mail,
  BookOpen,
  Table,
};

const DESCRIPTIONS: Record<string, string> = {
  plain: "Freeform notes, ideas, anything",
  meeting: "Attendees, agenda, action items",
  changelog: "Version, features, bug fixes",
  workflow: "Steps, roles, checklists",
  email: "Recipient, subject, body",
  book: "Chapters, scenes, word count",
  ledger: "Rows, columns, structured data",
};

interface HomePageProps {
  onNewNote: (type: NoteTypeId) => void;
}

export function HomePage({ onNewNote }: HomePageProps) {
  const [search, setSearch] = useState("");

  const filtered = NOTE_TYPES.filter(({ label }) =>
    label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-auto bg-th-bg">
      <div className="max-w-2xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-th-text">
            What would you like to write?
          </h1>
          <p className="text-sm text-th-text-muted mt-1">
            Pick a template to get started
          </p>
        </div>

        {/* Template search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-th-text-muted" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-th-sidebar"
          />
        </div>

        {/* Template cards */}
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(({ id, label, icon }) => {
            const Icon = ICONS[icon];
            const desc = DESCRIPTIONS[id] || "";
            return (
              <button
                key={id}
                onClick={() => onNewNote(id)}
                className={cn(
                  "group flex items-start gap-4 p-5 rounded-xl border border-th-border text-left",
                  "bg-th-sidebar hover:border-th-accent/40 transition-all",
                  "hover:shadow-[0_0_24px_rgba(var(--th-accent-rgb,212,88,10),0.06)]"
                )}
              >
                <div className="w-10 h-10 rounded-lg bg-th-surface flex items-center justify-center shrink-0 group-hover:bg-[color-mix(in_srgb,var(--th-accent)_12%,transparent)] transition-colors">
                  {Icon && (
                    <Icon className="h-5 w-5 text-th-text-muted group-hover:text-th-accent transition-colors" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-th-text block group-hover:text-th-accent transition-colors">
                    {label}
                  </span>
                  <span className="text-xs text-th-text-muted mt-0.5 block">
                    {desc}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p className="text-sm text-th-text-muted text-center py-8">
            No templates match "{search}"
          </p>
        )}
      </div>
    </div>
  );
}
