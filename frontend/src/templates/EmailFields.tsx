import { Input } from "@/components/ui/input";
import { TagInput } from "@/components/ui/tag-input";
import { FieldRow } from "./FieldRow";
import { type EmailMeta, parseMeta } from "./types";

const DEFAULT: EmailMeta = {
  to: [],
  subject: "",
};

interface Props {
  metadata: string;
  onChange: (metadata: string) => void;
}

export function EmailFields({ metadata, onChange }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = parseMeta<Record<string, any>>(metadata, DEFAULT as any);
  const meta = {
    ...raw,
    to: Array.isArray(raw.to)
      ? raw.to as string[]
      : typeof raw.to === "string" && raw.to
        ? raw.to.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [],
  } as EmailMeta;

  const update = (patch: Partial<typeof meta>) => {
    onChange(JSON.stringify({ ...meta, ...patch }));
  };

  return (
    <div className="space-y-3">
      <FieldRow label="To">
        <TagInput
          value={meta.to}
          onChange={(to) => update({ to })}
          placeholder="Add recipients, separate with comma..."
        />
      </FieldRow>
      <FieldRow label="Subject">
        <Input
          placeholder="Email subject..."
          value={meta.subject}
          onChange={(e) => update({ subject: e.target.value })}
        />
      </FieldRow>
    </div>
  );
}
