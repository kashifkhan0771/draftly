import { Download, X } from "lucide-react";
import { useState } from "react";
import { OpenReleasePage } from "../../wailsjs/go/main/App";

interface Props {
  latestVer: string;
}

export function UpdateBanner({ latestVer }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-1.5 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-500 shrink-0">
      <Download className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">
        Draftly v{latestVer} is available
      </span>
      <button
        onClick={() => OpenReleasePage()}
        className="ml-2 px-3 py-0.5 text-xs font-semibold rounded-md bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
      >
        Download
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="ml-1 text-emerald-500/60 hover:text-emerald-500"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
