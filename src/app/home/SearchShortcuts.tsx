"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import posthog from "posthog-js";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";

export const HERO_ID = "haut";
export const SEARCH_ID = "recherche";
export const CLOSING_ID = "fin";

// There is a single search input on the page, in the hero: two inputs would
// share isSearchFocusedAtom and open together. On mobile, focusing it opens it
// full screen; on desktop its results drop down under it, hence the scroll.
const focusHeroSearch = (source: string) => {
  posthog.capture("home_search_shortcut_clicked", { source });
  window.scrollTo({ top: 0, behavior: "smooth" });
  document
    .querySelector<HTMLInputElement>(`#${SEARCH_ID} input`)
    ?.focus({ preventScroll: true });
};

export function SearchCtaButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => focusHeroSearch("reasons")}
      className="h-[52px] md:h-14 px-7 rounded-full bg-deepblue text-white text-[16px] md:text-[17px] font-semibold flex items-center justify-center gap-2.5 cursor-pointer outline-none focus-visible:shadow-[0_0_0_3px_rgba(0,92,223,0.18)]"
    >
      <MagnifyingGlassIcon size={19} />
      {children}
    </button>
  );
}

export function SearchTextLink({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => focusHeroSearch("reasons_inline")}
      className="font-semibold underline underline-offset-4 cursor-pointer rounded outline-none focus-visible:shadow-[0_0_0_3px_rgba(0,92,223,0.18)]"
    >
      {children}
    </button>
  );
}

// A closed <details> doesn't open when a fragment link targets it.
export function OpenQuestionLink({
  questionId,
  children,
}: {
  questionId: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={`#${questionId}`}
      onClick={() => {
        const details = document.getElementById(questionId);
        if (details instanceof HTMLDetailsElement) details.open = true;
      }}
      className="inline-flex items-center gap-2 min-h-11 mt-2 text-[15px] md:text-[16px] font-semibold text-deepblue underline-offset-4 hover:underline rounded-full outline-none focus-visible:shadow-[0_0_0_3px_rgba(0,92,223,0.18)]"
    >
      {children}
    </a>
  );
}

export function SearchLauncher() {
  return (
    <button
      type="button"
      onClick={() => focusHeroSearch("closing")}
      className="flex-1 min-w-0 h-14 md:h-[60px] px-5 rounded-full bg-white text-deepblue/60 text-[17px] flex items-center gap-3 cursor-pointer outline-none focus-visible:shadow-[0_0_0_3px_rgba(0,92,223,0.18)]"
    >
      <MagnifyingGlassIcon size={20} className="text-deepblue shrink-0" />
      <span className="truncate">Chercher une église ou une ville</span>
    </button>
  );
}

export function StickySearchPill() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById(HERO_ID);
    const closing = document.getElementById(CLOSING_ID);
    if (!hero || !closing) return;
    const onScreen = new Map<Element, boolean>([
      [hero, true],
      [closing, false],
    ]);
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries)
        onScreen.set(entry.target, entry.isIntersecting);
      setIsVisible(!onScreen.get(hero) && !onScreen.get(closing));
    });
    observer.observe(hero);
    observer.observe(closing);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      aria-hidden={!isVisible}
      className={clsx(
        "md:hidden fixed inset-x-0 bottom-0 z-30 flex justify-center px-5 pb-[max(20px,env(safe-area-inset-bottom))] pointer-events-none transition duration-200 ease-in-out motion-reduce:transition-none",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
      )}
    >
      <button
        type="button"
        tabIndex={isVisible ? 0 : -1}
        onClick={() => focusHeroSearch("sticky")}
        className={clsx(
          "h-[52px] px-6 rounded-full bg-deepblue text-white text-[16px] font-semibold flex items-center gap-2.5 shadow-[0_6px_20px_-6px_rgba(36,46,76,0.32)] outline-none focus-visible:shadow-[0_0_0_3px_rgba(0,92,223,0.18)]",
          isVisible && "pointer-events-auto",
        )}
      >
        <MagnifyingGlassIcon size={19} />
        Trouver une confession
      </button>
    </div>
  );
}
