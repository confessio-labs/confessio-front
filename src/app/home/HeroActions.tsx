"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import posthog from "posthog-js";
import {
  ArrowCounterClockwiseIcon,
  CircleNotchIcon,
  CrosshairIcon,
} from "@phosphor-icons/react";
import { viewportBoundsAround } from "@/components/SearchInput";
import {
  parseLastSearch,
  readLastSearchRaw,
  subscribeToLastSearch,
} from "@/lib/lastSearch";

const FOCUS_RING =
  "outline-none focus-visible:shadow-[0_0_0_3px_rgba(0,92,223,0.18)]";

export function LocateButton({ className }: { className?: string }) {
  const router = useRouter();
  const [isLocating, setIsLocating] = useState(false);

  const locate = () => {
    if (isLocating) return;
    posthog.capture("home_locate_clicked");
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        router.push(
          `/?bounds=${viewportBoundsAround(coords.latitude, coords.longitude, 14)}`,
        );
      },
      () => {
        setIsLocating(false);
        router.push("/");
      },
    );
  };

  return (
    <button
      type="button"
      onClick={locate}
      disabled={isLocating}
      className={clsx(
        "flex-1 md:flex-none h-12 px-5 rounded-full border border-white/40 bg-deepblue/35 text-white text-[15px] md:text-[16px] font-medium flex items-center justify-center gap-2.5 cursor-pointer disabled:cursor-default",
        FOCUS_RING,
        className,
      )}
    >
      {isLocating ? (
        <CircleNotchIcon size={18} className="animate-spin" />
      ) : (
        <CrosshairIcon size={18} />
      )}
      Autour de moi
    </button>
  );
}

export function HeroActions() {
  const lastSearchRaw = useSyncExternalStore(
    subscribeToLastSearch,
    readLastSearchRaw,
    () => null,
  );
  const lastSearch = useMemo(
    () => parseLastSearch(lastSearchRaw),
    [lastSearchRaw],
  );

  return (
    <div className="flex gap-2.5 md:gap-5 md:items-center">
      <LocateButton />
      {lastSearch && (
        <Link
          href={lastSearch.href}
          onClick={() => posthog.capture("home_last_search_clicked")}
          className={clsx(
            "flex-1 md:flex-none min-w-0 h-12 px-5 rounded-full bg-white/12 md:bg-transparent md:px-0 text-[15px] font-medium text-white md:text-white/80 flex items-center justify-center gap-2",
            FOCUS_RING,
          )}
        >
          <ArrowCounterClockwiseIcon size={16} className="shrink-0" />
          <span className="truncate">
            <span className="hidden md:inline">Reprendre&nbsp;: </span>
            {lastSearch.label}
          </span>
        </Link>
      )}
    </div>
  );
}
