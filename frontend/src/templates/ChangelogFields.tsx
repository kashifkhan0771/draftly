import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldRow } from "./FieldRow";
import { type ChangelogMeta, parseMeta } from "./types";

const DEFAULT: ChangelogMeta = {
  version: "",
  releaseDate: "",
  newFeatures: "",
  bugFixes: "",
};

interface Props {
  metadata: string;
  onChange: (metadata: string) => void;
}

export function ChangelogFields({ metadata, onChange }: Props) {
  const meta = parseMeta(metadata, DEFAULT);

  const update = (field: keyof ChangelogMeta, value: string) => {
    onChange(JSON.stringify({ ...meta, [field]: value }));
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <FieldRow label="Version">
          <Input
            placeholder="v1.0.0"
            value={meta.version}
            onChange={(e) => update("version", e.target.value)}
          />
        </FieldRow>
        <FieldRow label="Date">
          <Input
            type="date"
            value={meta.releaseDate}
            onChange={(e) => update("releaseDate", e.target.value)}
          />
        </FieldRow>
      </div>
      <FieldRow label="New">
        <Textarea
          placeholder="New features..."
          value={meta.newFeatures}
          onChange={(e) => update("newFeatures", e.target.value)}
          rows={2}
        />
      </FieldRow>
      <FieldRow label="Fixes">
        <Textarea
          placeholder="Bug fixes..."
          value={meta.bugFixes}
          onChange={(e) => update("bugFixes", e.target.value)}
          rows={2}
        />
      </FieldRow>
    </div>
  );
}
