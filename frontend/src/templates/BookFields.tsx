import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldRow } from "./FieldRow";
import { type BookMeta, parseMeta } from "./types";

const DEFAULT: BookMeta = {
  chapterTitle: "",
  sceneNotes: "",
  wordCountGoal: 0,
};

interface Props {
  metadata: string;
  onChange: (metadata: string) => void;
  currentWordCount: number;
}

export function BookFields({ metadata, onChange, currentWordCount }: Props) {
  const meta = parseMeta(metadata, DEFAULT);

  const update = (field: keyof BookMeta, value: string | number) => {
    onChange(JSON.stringify({ ...meta, [field]: value }));
  };

  const goalReached = meta.wordCountGoal > 0 && currentWordCount >= meta.wordCountGoal;

  return (
    <div className="space-y-3">
      <FieldRow label="Chapter">
        <Input
          placeholder="Chapter title..."
          value={meta.chapterTitle}
          onChange={(e) => update("chapterTitle", e.target.value)}
        />
      </FieldRow>
      <FieldRow label="Scene Notes">
        <Textarea
          placeholder="Scene notes, outline..."
          value={meta.sceneNotes}
          onChange={(e) => update("sceneNotes", e.target.value)}
          rows={2}
        />
      </FieldRow>
      <FieldRow label="Words">
        <div className="flex items-center gap-3">
          <span className="text-sm text-th-text tabular-nums">
            {currentWordCount.toLocaleString()}
          </span>
          <span className="text-xs text-th-text-muted">/</span>
          <Input
            type="number"
            placeholder="Goal"
            value={meta.wordCountGoal || ""}
            onChange={(e) => update("wordCountGoal", parseInt(e.target.value) || 0)}
            className="w-24 h-8 text-xs"
          />
          {goalReached && (
            <span className="text-xs font-medium text-green-500">Goal reached!</span>
          )}
        </div>
      </FieldRow>
    </div>
  );
}
