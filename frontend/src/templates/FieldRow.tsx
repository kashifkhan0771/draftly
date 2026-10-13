interface FieldRowProps {
  label: string;
  children: React.ReactNode;
}

export function FieldRow({ label, children }: FieldRowProps) {
  return (
    <div className="flex items-start gap-3">
      <label className="text-xs font-medium text-th-text-muted w-24 shrink-0 pt-2 uppercase tracking-wider">
        {label}
      </label>
      <div className="flex-1">{children}</div>
    </div>
  );
}
