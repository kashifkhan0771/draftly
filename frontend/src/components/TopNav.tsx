import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import logoImg from "@/assets/logo.png";

interface TopNavProps {
  onNewNote: () => void;
}

export function TopNav({ onNewNote }: TopNavProps) {
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);

  return (
    <div className="flex items-center gap-3 border-b border-th-border px-4 py-2 bg-th-sidebar">
      <div className="flex items-center gap-2 shrink-0">
        <img src={logoImg} alt="Draftly" className="h-6 w-6" />
        <h1 className="text-lg font-bold text-th-accent tracking-tight">
          Draftly
        </h1>
      </div>
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-th-text-muted" />
        <Input
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-8 bg-th-bg text-sm"
        />
      </div>
      <Button size="sm" onClick={onNewNote}>
        <Plus className="h-4 w-4 mr-1" />
        New Note
      </Button>
    </div>
  );
}
