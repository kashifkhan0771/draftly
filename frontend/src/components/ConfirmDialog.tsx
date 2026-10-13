import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";

export function ConfirmDialog() {
  const dialog = useAppStore((s) => s.confirmDialog);
  const hide = useAppStore((s) => s.hideConfirm);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!dialog) return;
    confirmBtnRef.current?.focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        hide();
      } else if (e.key === "Enter") {
        e.preventDefault();
        dialog.onConfirm();
        hide();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dialog, hide]);

  if (!dialog) return null;

  const accept = () => {
    dialog.onConfirm();
    hide();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={hide}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm mx-4 rounded-xl border border-th-border bg-th-sidebar shadow-2xl p-6"
      >
        <div className="flex items-start gap-3 mb-4">
          {dialog.destructive && (
            <div className="shrink-0 w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-red-400" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3
              id="confirm-dialog-title"
              className="text-base font-semibold text-th-text mb-1"
            >
              {dialog.title}
            </h3>
            <p className="text-sm text-th-text-muted leading-relaxed">
              {dialog.message}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" size="sm" onClick={hide}>
            {dialog.cancelLabel || "Cancel"}
          </Button>
          <Button
            ref={confirmBtnRef}
            variant={dialog.destructive ? "destructive" : "default"}
            size="sm"
            onClick={accept}
          >
            {dialog.confirmLabel || "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  );
}
