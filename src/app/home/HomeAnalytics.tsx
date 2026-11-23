"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

const SECTION_ATTR = "data-home-section";
const FAQ_ATTR = "data-faq-id";

const DWELL_MS = 1500;
const THRESHOLDS = Array.from({ length: 11 }, (_, i) => i / 10);

// A section counts as seen once it has filled half the viewport (or half of
// itself, when shorter than the viewport) for DWELL_MS. Plain intersection
// ratios don't work here: the FAQ is taller than a phone screen, so it never
// reaches a 0.5 ratio.
const isSeen = (entry: IntersectionObserverEntry) =>
  entry.intersectionRect.height >=
  Math.min(entry.boundingClientRect.height, window.innerHeight) * 0.5;

export function HomeAnalytics() {
  useEffect(() => {
    const timers = new Map<Element, ReturnType<typeof setTimeout>>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const section = entry.target.getAttribute(SECTION_ATTR);
          if (!section) continue;
          if (isSeen(entry)) {
            if (timers.has(entry.target)) continue;
            timers.set(
              entry.target,
              setTimeout(() => {
                posthog.capture("home_section_viewed", { section });
                observer.unobserve(entry.target);
              }, DWELL_MS),
            );
          } else {
            clearTimeout(timers.get(entry.target));
            timers.delete(entry.target);
          }
        }
      },
      { threshold: THRESHOLDS },
    );
    document
      .querySelectorAll(`[${SECTION_ATTR}]`)
      .forEach((section) => observer.observe(section));

    // "toggle" doesn't bubble, so it is caught on the way down instead.
    const onToggle = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLDetailsElement) || !target.open) return;
      const questionId = target.getAttribute(FAQ_ATTR);
      if (questionId)
        posthog.capture("faq_opened", { question_id: questionId });
    };
    document.addEventListener("toggle", onToggle, true);

    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
      document.removeEventListener("toggle", onToggle, true);
    };
  }, []);

  return null;
}
