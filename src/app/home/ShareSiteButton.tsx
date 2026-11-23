"use client";

import { useEffect, useState } from "react";
import posthog from "posthog-js";
import { CheckIcon, ExportIcon } from "@phosphor-icons/react";

export function ShareSiteButton() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timeout);
  }, [copied]);

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Confessio", url });
        posthog.capture("site_shared", { method: "native" });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      posthog.capture("site_shared", { method: "clipboard" });
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={share}
      className="h-12 px-5 rounded-full border border-hairline bg-white text-deepblue text-[16px] font-semibold flex items-center justify-center gap-2.5 cursor-pointer outline-none focus-visible:shadow-[0_0_0_3px_rgba(0,92,223,0.18)]"
    >
      {copied ? <CheckIcon size={18} /> : <ExportIcon size={18} />}
      {copied ? "Lien copié" : "Faire connaître Confessio"}
    </button>
  );
}
