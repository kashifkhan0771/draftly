import { useState, useRef, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function TagInput({ value, onChange, placeholder, className }: TagInputProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTags = (text: string) => {
    const newTags = text
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && !value.includes(t));
    if (newTags.length > 0) {
      onChange([...value, ...newTags]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.includes(",")) {
      addTags(val);
      setInput("");
    } else {
      setInput(val);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      addTags(input);
      setInput("");
    }
    if (e.key === "Backspace" && input === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 min-h-[36px] w-full rounded-md border border-th-border bg-transparent px-2 py-1.5 cursor-text",
        "focus-within:ring-2 focus-within:ring-[var(--th-accent)]/30 focus-within:border-[var(--th-accent)]/50",
        className
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 bg-th-surface text-th-text text-xs font-medium px-2 py-0.5 rounded-md"
        >
          {tag}
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeTag(i);
            }}
            className="text-th-text-muted hover:text-th-text"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[80px] bg-transparent text-sm text-th-text placeholder:text-th-text-muted outline-none"
      />
    </div>
  );
}
