import { cn } from "@/lib/utils";

export type ThemeName = "fox" | "raven" | "moose" | "penguin" | "polarbear";

interface ThemeOption {
  id: ThemeName;
  label: string;
  accent: string;
  emoji: string;
  bgPreview: string;
  sidebarPreview: string;
  mode: "dark" | "light";
  funFact: string;
}

const themes: ThemeOption[] = [
  {
    id: "fox",
    label: "Fox",
    accent: "#d4580a",
    emoji: "\u{1F98A}",
    bgPreview: "#0F0F10",
    sidebarPreview: "#1A1A1E",
    mode: "dark",
    funFact: "A fox can hear a watch ticking from 40 yards away. Their ears rotate independently to pinpoint sounds beneath snow.",
  },
  {
    id: "raven",
    label: "Raven",
    accent: "#a78bfa",
    emoji: "\u{1F426}\u200D\u2B1B",
    bgPreview: "#050508",
    sidebarPreview: "#0e0e14",
    mode: "dark",
    funFact: "Ravens can mimic human speech and have been observed sliding down snowy rooftops for fun. They also use tools in the wild.",
  },
  {
    id: "moose",
    label: "Moose",
    accent: "#8B5E3C",
    emoji: "\u{1F98C}",
    bgPreview: "#100d09",
    sidebarPreview: "#1a1510",
    mode: "dark",
    funFact: "Moose are excellent swimmers and can dive up to 6 meters deep. Their antlers can span over 1.8 meters wide.",
  },
  {
    id: "penguin",
    label: "Penguin",
    accent: "#1a1a1a",
    emoji: "\u{1F427}",
    bgPreview: "#ffffff",
    sidebarPreview: "#f4f4f4",
    mode: "light",
    funFact: "Emperor penguins can hold their breath for over 20 minutes and dive deeper than 500 meters \u2014 the deepest of any bird.",
  },
  {
    id: "polarbear",
    label: "Polar Bear",
    accent: "#2563eb",
    emoji: "\u{1F43B}\u200D\u2744\uFE0F",
    bgPreview: "#f8f9ff",
    sidebarPreview: "#eef0f8",
    mode: "light",
    funFact: "Polar bear fur is actually transparent, not white. Their skin underneath is black, which helps absorb heat from the sun.",
  },
];

interface ThemeSelectorProps {
  activeTheme: ThemeName;
  onSelect: (theme: ThemeName) => void;
}

export function ThemeSelector({ activeTheme, onSelect }: ThemeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {themes.map((theme) => {
        const isActive = activeTheme === theme.id;
        return (
          <button
            key={theme.id}
            onClick={() => onSelect(theme.id)}
            className={cn(
              "relative flex flex-col rounded-xl border-2 p-4 transition-all text-left overflow-hidden",
              isActive
                ? "border-th-accent shadow-[0_0_16px_rgba(var(--th-accent-rgb,212,88,10),0.15)]"
                : "border-th-border hover:border-th-text-muted/30"
            )}
          >
            {/* Mini preview of the theme */}
            <div
              className="w-full h-16 rounded-lg mb-3 flex overflow-hidden border"
              style={{ borderColor: theme.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)" }}
            >
              <div
                className="w-1/3 h-full"
                style={{ backgroundColor: theme.sidebarPreview }}
              />
              <div
                className="flex-1 h-full flex items-center justify-center"
                style={{ backgroundColor: theme.bgPreview }}
              >
                <div
                  className="w-8 h-1 rounded-full opacity-60"
                  style={{ backgroundColor: theme.accent }}
                />
              </div>
            </div>

            {/* Emoji + label */}
            <div className="flex items-center gap-2.5">
              <span className="text-2xl leading-none">{theme.emoji}</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-th-text block">
                  {theme.label}
                </span>
                <span className="text-[10px] text-th-text-muted capitalize">
                  {theme.mode} mode
                </span>
              </div>
              {/* Accent color dot */}
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: theme.accent }}
              />
            </div>

            {/* Fun fact — shown only when selected */}
            {isActive && (
              <p className="mt-3 text-[11px] text-th-text-muted leading-relaxed italic border-t border-th-border pt-3">
                {theme.funFact}
              </p>
            )}

            {/* Active checkmark */}
            {isActive && (
              <div
                className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs"
                style={{ backgroundColor: theme.accent }}
              >
                &#10003;
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
