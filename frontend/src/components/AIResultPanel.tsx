import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AIResultPanelProps {
  result: string;
  mode: "rewrite" | "summarize";
  onAccept: () => void;
  onDiscard: () => void;
}

export function AIResultPanel({ result, mode, onAccept, onDiscard }: AIResultPanelProps) {
  const label = mode === "rewrite" ? "AI Rewrite" : "AI Summary";

  return (
    <div className="border-t border-th-border bg-th-sidebar/50 px-6 py-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-th-accent">{label}</span>
        <div className="flex gap-1.5">
          {mode === "rewrite" && (
            <Button variant="ghost" size="sm" onClick={onAccept} className="text-xs h-7 gap-1 text-green-500 hover:text-green-400">
              <Check className="h-3.5 w-3.5" /> Accept
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onDiscard} className="text-xs h-7 gap-1 text-th-text-muted">
            <X className="h-3.5 w-3.5" /> {mode === "rewrite" ? "Discard" : "Dismiss"}
          </Button>
        </div>
      </div>
      <div className="max-h-48 overflow-auto rounded-lg bg-th-surface/50 p-3 text-sm text-th-text leading-relaxed whitespace-pre-wrap">
        {result}
      </div>
    </div>
  );
}
