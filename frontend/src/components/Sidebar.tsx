import { Settings, Home, Pin, Info, Files, Trash2 } from "lucide-react";
import { NoteList } from "@/components/NoteList";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";

interface SidebarProps {
  onDeleteNote: (id: number) => void;
}

export function Sidebar({ onDeleteNote }: SidebarProps) {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const pinnedCount = useAppStore((s) => s.notes.filter((n) => n.pinned).length);
  const noteCount = useAppStore((s) => s.notes.length);

  return (
    <div className="w-64 border-r border-th-border flex flex-col bg-th-sidebar h-full">
      {/* Nav links */}
      <div className="px-2 pt-2 pb-1 space-y-0.5">
        <NavButton
          icon={<Home className="h-4 w-4" />}
          label="Home"
          isActive={view === "home"}
          onClick={() => setView("home")}
        />
        <NavButton
          icon={<Files className="h-4 w-4" />}
          label="All Notes"
          badge={noteCount > 0 ? noteCount : undefined}
          isActive={view === "allnotes"}
          onClick={() => setView("allnotes")}
        />
        <NavButton
          icon={<Pin className="h-4 w-4" />}
          label="Pinboard"
          badge={pinnedCount > 0 ? pinnedCount : undefined}
          isActive={view === "pinboard"}
          onClick={() => setView("pinboard")}
        />
      </div>

      <div className="h-px bg-th-border mx-3" />

      <div className="px-4 py-2">
        <h2 className="text-xs font-semibold text-th-text-muted uppercase tracking-wider">
          Recent
        </h2>
      </div>

      <NoteList onDelete={onDeleteNote} />

      {/* Bottom nav */}
      <div className="mt-auto border-t border-th-border px-2 py-2 space-y-0.5">
        <NavButton
          icon={<Info className="h-4 w-4" />}
          label="About"
          isActive={view === "about"}
          onClick={() => setView("about")}
        />
        <NavButton
          icon={<Trash2 className="h-4 w-4" />}
          label="Trash"
          isActive={view === "trash"}
          onClick={() => setView("trash")}
        />
        <NavButton
          icon={<Settings className="h-4 w-4" />}
          label="Settings"
          isActive={view === "settings"}
          onClick={() => setView("settings")}
        />
      </div>
    </div>
  );
}

function NavButton({
  icon,
  label,
  badge,
  isActive,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors",
        isActive
          ? "text-th-accent bg-[color-mix(in_srgb,var(--th-accent)_8%,transparent)]"
          : "text-th-text-muted hover:text-th-text hover:bg-th-surface/50"
      )}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && (
        <span className="text-[10px] bg-th-surface px-1.5 py-0.5 rounded-full tabular-nums">
          {badge}
        </span>
      )}
    </button>
  );
}
