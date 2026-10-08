import { useEffect, useState } from "react";
import posthog from "posthog-js";
import { CheckIcon, ExportIcon } from "@phosphor-icons/react";

const ShareButton = ({
  title,
  path,
  churchUuid,
}: {
  title: string;
  path: string;
  churchUuid: string;
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timeout);
  }, [copied]);

  const share = async () => {
    const url = `${window.location.origin}${path}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        posthog.capture("church_shared", {
          church_uuid: churchUuid,
          method: "native",
        });
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
      posthog.capture("church_shared", {
        church_uuid: churchUuid,
        method: "clipboard",
      });
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={share}
      aria-label={copied ? "Lien copié" : "Partager"}
      title={copied ? "Lien copié" : "Partager"}
      className="shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors z-10"
    >
      {copied ? (
        <CheckIcon size={16} weight="bold" color="white" />
      ) : (
        <ExportIcon size={16} weight="bold" color="white" />
      )}
    </button>
  );
};

export default ShareButton;
