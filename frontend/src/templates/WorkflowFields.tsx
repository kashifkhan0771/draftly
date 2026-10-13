import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import { FieldRow } from "./FieldRow";
import { type WorkflowMeta, parseMeta } from "./types";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DEFAULT: WorkflowMeta = {
  steps: "",
  roles: [],
  checklist: [],
};

interface Props {
  metadata: string;
  onChange: (metadata: string) => void;
}

export function WorkflowFields({ metadata, onChange }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = parseMeta<Record<string, any>>(metadata, DEFAULT as any);
  const meta = {
    ...raw,
    roles: Array.isArray(raw.roles)
      ? raw.roles as string[]
      : typeof raw.roles === "string" && raw.roles
        ? raw.roles.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [],
  } as WorkflowMeta;

  const update = (patch: Partial<typeof meta>) => {
    onChange(JSON.stringify({ ...meta, ...patch }));
  };

  const addCheckItem = () => {
    update({ checklist: [...meta.checklist, { text: "", done: false }] });
  };

  const updateCheckItem = (i: number, text: string) => {
    const list = [...meta.checklist];
    list[i] = { ...list[i], text };
    update({ checklist: list });
  };

  const toggleCheckItem = (i: number) => {
    const list = [...meta.checklist];
    list[i] = { ...list[i], done: !list[i].done };
    update({ checklist: list });
  };

  const removeCheckItem = (i: number) => {
    update({ checklist: meta.checklist.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="space-y-3">
      <FieldRow label="Steps">
        <Textarea
          placeholder="Step-by-step process..."
          value={meta.steps}
          onChange={(e) => update({ steps: e.target.value })}
          rows={2}
        />
      </FieldRow>
      <FieldRow label="Roles">
        <TagInput
          value={meta.roles}
          onChange={(roles) => update({ roles })}
          placeholder="Add roles, separate with comma..."
        />
      </FieldRow>
      <FieldRow label="Checklist">
        <div className="space-y-1.5">
          {meta.checklist.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggleCheckItem(i)}
                className="accent-[var(--th-accent)] h-4 w-4"
              />
              <Input
                value={item.text}
                onChange={(e) => updateCheckItem(i, e.target.value)}
                placeholder="Checklist item..."
                className="h-8 text-xs"
              />
              <button
                onClick={() => removeCheckItem(i)}
                className="text-th-text-muted hover:text-red-500 shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={addCheckItem} className="text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add item
          </Button>
        </div>
      </FieldRow>
    </div>
  );
}
