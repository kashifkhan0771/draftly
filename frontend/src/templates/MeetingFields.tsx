import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import { FieldRow } from "./FieldRow";
import { type MeetingMeta, parseMeta } from "./types";

const DEFAULT: MeetingMeta = {
  attendees: [],
  agenda: "",
  actionItems: "",
  owners: [],
};

interface Props {
  metadata: string;
  onChange: (metadata: string) => void;
}

export function MeetingFields({ metadata, onChange }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = parseMeta<Record<string, any>>(metadata, DEFAULT as any);
  // Backwards compat: convert old string format to array
  const meta = {
    ...raw,
    attendees: Array.isArray(raw.attendees)
      ? raw.attendees as string[]
      : typeof raw.attendees === "string" && raw.attendees
        ? raw.attendees.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [],
    owners: Array.isArray(raw.owners)
      ? raw.owners as string[]
      : typeof raw.owners === "string" && raw.owners
        ? raw.owners.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [],
  } as MeetingMeta;

  const update = (patch: Partial<typeof meta>) => {
    onChange(JSON.stringify({ ...meta, ...patch }));
  };

  return (
    <div className="space-y-3">
      <FieldRow label="Attendees">
        <TagInput
          value={meta.attendees}
          onChange={(attendees) => update({ attendees })}
          placeholder="Add names, separate with comma..."
        />
      </FieldRow>
      <FieldRow label="Agenda">
        <Textarea
          placeholder="Topics to discuss..."
          value={meta.agenda}
          onChange={(e) => update({ agenda: e.target.value })}
          rows={2}
        />
      </FieldRow>
      <FieldRow label="Actions">
        <Textarea
          placeholder="Action items..."
          value={meta.actionItems}
          onChange={(e) => update({ actionItems: e.target.value })}
          rows={2}
        />
      </FieldRow>
      <FieldRow label="Owners">
        <TagInput
          value={meta.owners}
          onChange={(owners) => update({ owners })}
          placeholder="Add owners, separate with comma..."
        />
      </FieldRow>
    </div>
  );
}
