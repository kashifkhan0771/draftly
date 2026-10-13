interface IconProps {
  className?: string;
  size?: number;
}

export function FoxIcon({ className, size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 4L8 12L4 20H10L12 16L14 20H20L16 12L20 4H14L12 8L10 4H4Z" fill="currentColor" opacity="0.9"/>
      <circle cx="9.5" cy="12" r="1" fill="var(--th-bg)"/>
      <circle cx="14.5" cy="12" r="1" fill="var(--th-bg)"/>
    </svg>
  );
}

export function RavenIcon({ className, size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 4C6 4 4 8 4 12C4 16 7 20 12 20C17 20 20 16 20 12L18 8L20 4L16 6L14 4H10L8 6L6 4Z" fill="currentColor" opacity="0.9"/>
      <circle cx="10" cy="11" r="1" fill="var(--th-bg)"/>
      <path d="M13 13L16 12" stroke="var(--th-bg)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function MooseIcon({ className, size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 4L6 8V4L9 8L12 6L15 8L18 4V8L21 4L19 10L17 12V18L15 20H9L7 18V12L5 10L3 4Z" fill="currentColor" opacity="0.9"/>
      <circle cx="10" cy="13" r="1" fill="var(--th-bg)"/>
      <circle cx="14" cy="13" r="1" fill="var(--th-bg)"/>
    </svg>
  );
}

export function GooseIcon({ className, size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M10 3C10 3 8 5 8 8C8 10 9 11 9 11L7 14L6 20H10L11 16H13L14 20H18L17 14L15 11C15 11 16 10 16 8C16 5 14 3 14 3L12 5L10 3Z" fill="currentColor" opacity="0.9"/>
      <circle cx="11" cy="8" r="1" fill="var(--th-bg)"/>
      <circle cx="13" cy="8" r="1" fill="var(--th-bg)"/>
    </svg>
  );
}

export function PolarBearIcon({ className, size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="7" cy="7" r="3" fill="currentColor" opacity="0.7"/>
      <circle cx="17" cy="7" r="3" fill="currentColor" opacity="0.7"/>
      <circle cx="12" cy="13" r="7" fill="currentColor" opacity="0.9"/>
      <circle cx="10" cy="12" r="1.2" fill="var(--th-bg)"/>
      <circle cx="14" cy="12" r="1.2" fill="var(--th-bg)"/>
      <ellipse cx="12" cy="15" rx="2" ry="1.2" fill="var(--th-bg)" opacity="0.5"/>
    </svg>
  );
}
