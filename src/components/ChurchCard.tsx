import { components } from "@/types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { createPortal } from "react-dom";
import ModalSheetScroller from "./ModalSheet/ModalSheetScroller";
import ModalSheetDragZone from "./ModalSheet/ModalSheetDragZone";
import { CommunityFeedback } from "./CommunityFeedback";
import ShareButton from "./ShareButton";
import {
  appTodayKey,
  fetchApi,
  getFrenchTimeString,
  getHolidayWarningReason,
  localDateKey,
} from "@/utils";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import posthog from "posthog-js";
import {
  ArrowSquareOutIcon,
  CircleNotchIcon,
  NavigationArrowIcon,
  SealCheckIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react";

type EventOut = components["schemas"]["EventOut"];

// Opening a church optimistically renders a summary card, then hands off to
// the server-rendered card for the same church — which remounts ChurchCard.
// Track the last church we captured a view for (module-level, survives the
// remount) so that handoff counts as one view, not two. A different church,
// or re-opening one after viewing another, still captures normally; only a
// consecutive re-mount for the same uuid is suppressed.
let lastViewedChurchUuid: string | null = null;

const formatDayLabel = (dayKey: string) => {
  const date = new Date(dayKey);
  const isToday = localDateKey(date) === appTodayKey();
  const dayName = isToday
    ? "Aujourd'hui"
    : date
        .toLocaleDateString("fr-FR", { weekday: "long" })
        .replace(/^./, (c) => c.toUpperCase());
  const dateNum = date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "numeric",
  });
  return { dayName, dateNum };
};

const formatTimeRange = (event: EventOut) => {
  const start = getFrenchTimeString(event.start);
  const end = event.end ? getFrenchTimeString(event.end) : null;
  return end ? `${start} - ${end}` : `${start}`;
};

const ChurchCard = ({
  church,
}: {
  church: components["schemas"]["ChurchDetails"];
}) => {
  const { data: churchDetails, isLoading } = useQuery<
    components["schemas"]["ChurchDetails"]
  >({
    queryKey: ["churchDetails", church.uuid],
    queryFn: () => fetchApi(`/church/${church.uuid}`),
    initialData: "schedules" in church ? church : undefined,
  });

  const eventsByDay = useMemo(() => {
    const events =
      churchDetails?.events.sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      ) ?? [];
    const byDay: Record<string, EventOut[]> = {};
    for (const event of events) {
      const key = new Date(event.start).toDateString();
      if (!byDay[key]) byDay[key] = [];
      byDay[key].push(event);
    }
    return byDay;
  }, [churchDetails?.events]);

  const dayKeys = useMemo(() => Object.keys(eventsByDay), [eventsByDay]);

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const selectedDay = dayKeys[selectedDayIndex];
  const eventsForDay = selectedDay ? (eventsByDay?.[selectedDay] ?? []) : [];

  const holidayWarningReason = getHolidayWarningReason(
    eventsForDay.flatMap((event) => event.periods ?? []),
  );

  const getSchedulesForEvent = (event: EventOut) => {
    if (!churchDetails) return [];
    const indices = new Set(event.schedules_indices);
    return churchDetails.schedules.filter((_, i) => indices.has(i));
  };

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const lightboxClosedByBackRef = useRef(false);
  useEffect(() => setPortalReady(true), []);

  useEffect(() => {
    if (!lightboxUrl) return;
    lightboxClosedByBackRef.current = false;
    // Push a no-URL history entry so the OS/browser back button closes the
    // lightbox first instead of leaving the church card.
    window.history.pushState({ confessioLightbox: true }, "");
    const onPopState = () => {
      lightboxClosedByBackRef.current = true;
      setLightboxUrl(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxUrl(null);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPopState);
      document.body.style.overflow = prevOverflow;
      // If closed via UI (X / backdrop / Escape), consume the history entry
      // we pushed — but only if it's still on top. If a route navigation
      // (e.g. closing the church card) happened first, our entry is buried
      // and calling back() would surface it again.
      if (
        !lightboxClosedByBackRef.current &&
        window.history.state?.confessioLightbox
      ) {
        window.history.back();
      }
    };
  }, [lightboxUrl]);

  // True while showing the optimistic summary card (built by summaryToCard,
  // which has no website record) before the full record arrives. Drives
  // skeletons for the parts the summary lacks so nothing shifts on load.
  const isSummary = Boolean(churchDetails) && churchDetails?.website == null;

  const searchParams = useSearchParams();
  const query = searchParams.toString();

  useEffect(() => {
    const prev = document.title;
    document.title = `${church.name} — Confessio`;
    if (lastViewedChurchUuid !== church.uuid) {
      lastViewedChurchUuid = church.uuid;
      posthog.capture("church_viewed", {
        church_uuid: church.uuid,
        church_name: church.name,
        church_city: church.city,
      });
    }
    return () => {
      document.title = prev;
    };
  }, [church.name, church.uuid, church.city]);

  return (
    <>
      <ModalSheetDragZone>
        <div className="px-5 pt-4 pb-3 flex justify-between gap-2 items-start">
          <div className="flex flex-col gap-1.5 min-w-0">
            <h3 className="text-white leading-[1.15] text-[22px] font-semibold tracking-[-0.01em]">
              {church.name}
            </h3>
            <Link
              href={`https://www.google.com/maps/dir/?api=1&destination=${church.latitude},${church.longitude}`}
              target="_blank"
              className="group inline-flex items-start gap-1.5 self-start text-[13px] leading-snug text-white/70 hover:text-white transition-colors"
              onClick={() =>
                posthog.capture("directions_opened", {
                  church_uuid: church.uuid,
                  church_name: church.name,
                })
              }
            >
              <NavigationArrowIcon
                size={14}
                weight="fill"
                className="mt-[3px] shrink-0 text-white/55 group-hover:text-white transition-colors"
              />
              <span className="whitespace-pre-line">
                {[church.address, church.city].filter(Boolean).join("\n")}
              </span>
            </Link>
          </div>
          <div className="shrink-0 flex flex-col gap-2">
            <Link
              href={`/?${query}`}
              aria-label="Fermer"
              className="shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors z-10"
            >
              <XIcon size={16} weight="bold" color="white" />
            </Link>
            <ShareButton
              title={`${church.name} — Confessio`}
              path={`/church/${church.uuid}`}
              churchUuid={church.uuid}
            />
          </div>
        </div>

        <hr className="mx-0 border-0 h-px bg-white/12" />
      </ModalSheetDragZone>

      <ModalSheetScroller draggableAt="top">
        {isSummary ? (
          <div className="px-5 pt-3 pb-1 flex">
            {/* Same text + classes as the real link so the height (and width)
                match exactly — no shift when the link replaces it. */}
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium rounded-full bg-white/12 text-transparent select-none motion-safe:animate-pulse">
              Paroisse de {church.name}
            </span>
          </div>
        ) : (
          churchDetails?.website?.home_url && (
            <div className="px-5 pt-3 pb-1 flex">
              <Link
                href={churchDetails.website.home_url}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-white/75 hover:text-white transition-colors"
                onClick={() =>
                  posthog.capture("parish_website_clicked", {
                    church_uuid: church.uuid,
                    church_name: church.name,
                    parish_url: churchDetails.website?.home_url,
                  })
                }
              >
                <span>Paroisse de {church.name}</span>
                <ArrowSquareOutIcon
                  size={13}
                  weight="bold"
                  className="shrink-0"
                />
              </Link>
            </div>
          )
        )}
        <div className="pb-6 pt-2">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <CircleNotchIcon
                size={24}
                color="white"
                className="animate-spin"
              />
            </div>
          )}

          {churchDetails && dayKeys.length > 0 && (
            <div className="mx-3">
              <div className="flex gap-0 overflow-x-auto snap-x snap-mandatory px-[calc(50%-40px)] scrollbar-hide">
                {dayKeys.map((dayKey, i) => {
                  const { dayName, dateNum } = formatDayLabel(dayKey);
                  const isSelected = i === selectedDayIndex;
                  return (
                    <button
                      key={dayKey}
                      onClick={(e) => {
                        setSelectedDayIndex(i);
                        e.currentTarget.scrollIntoView({
                          behavior: "smooth",
                          inline: "center",
                          block: "nearest",
                        });
                      }}
                      className={[
                        "day-tab relative flex flex-col items-center shrink-0 snap-center px-3 pt-1 pb-2 text-[14px] font-semibold leading-tight rounded-t-xl transition-colors",
                        isSelected
                          ? "day-tab-selected bg-paper text-deepblue"
                          : "bg-transparent text-white/65 hover:text-white/90",
                      ].join(" ")}
                    >
                      <span className="text-[11px] font-medium uppercase tracking-[0.08em] opacity-80">
                        {dayName}
                      </span>
                      <span className="tabular text-[15px] font-semibold leading-tight">
                        {dateNum}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="rounded-xl bg-paper overflow-hidden divide-y divide-hairline shadow-[0_4px_16px_-6px_rgba(0,0,0,0.25)]">
                {holidayWarningReason && (
                  <div className="flex items-center gap-2 px-4 py-2.5 text-[12.5px] font-medium text-warn-amber bg-warn-amber-bg">
                    <WarningCircleIcon
                      size={15}
                      weight="fill"
                      className="shrink-0"
                      style={{ color: "#b4690e" }}
                    />
                    <span>
                      Horaires susceptibles de changer {holidayWarningReason}.
                    </span>
                  </div>
                )}
                {eventsForDay.map((event, i) => {
                  const schedules = getSchedulesForEvent(event);
                  return (
                    <div
                      key={`${event.start}-${i}`}
                      className="px-4 py-3.5 flex flex-col gap-2"
                    >
                      <div className="flex justify-center">
                        <span className="tabular inline-flex items-center rounded-full px-4 py-1.5 text-[15px] font-semibold bg-deepblue text-white">
                          {formatTimeRange(event)}
                        </span>
                      </div>
                      {schedules.length === 0 &&
                        isSummary &&
                        event.schedules_indices.length > 0 && (
                          <div className="flex flex-col gap-2.5">
                            {event.schedules_indices.map((_, j) => (
                              <div key={j} className="flex flex-col gap-1.5">
                                <div className="h-3 rounded bg-ink/10 motion-safe:animate-pulse" />
                                <div className="h-3 w-3/5 rounded bg-ink/10 motion-safe:animate-pulse" />
                              </div>
                            ))}
                          </div>
                        )}
                      {schedules.length > 0 && (
                        <div className="flex flex-col gap-1.5 text-[13px] leading-relaxed text-ink/70">
                          {schedules.map((s, j) => {
                            const sourceParsing = s.sources
                              .filter(
                                (src) =>
                                  src.source_type === "parsing" &&
                                  src.parsing_uuid,
                              )
                              .map((src) =>
                                churchDetails.parsings.find(
                                  (p) => p.uuid === src.parsing_uuid,
                                ),
                              )
                              .find((p) => p?.scraping_url || p?.image_url);
                            const pageUrl = sourceParsing?.scraping_url ?? null;
                            const imageUrl = !pageUrl
                              ? (sourceParsing?.image_url ?? null)
                              : null;
                            const hasOclocher = s.sources.some(
                              (src) => src.source_type === "oclocher",
                            );
                            return (
                              <div
                                key={j}
                                className="whitespace-pre-line flex flex-col gap-1"
                              >
                                <p>{s.explanation}</p>
                                {hasOclocher && (
                                  <div className="flex justify-end">
                                    <span
                                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 border select-none"
                                      style={{
                                        borderColor: "#609E2E",
                                        color: "#609E2E",
                                      }}
                                      title="Source vérifiée par OClocher"
                                    >
                                      <SealCheckIcon size={12} weight="fill" />
                                      <span className="text-[11px] font-medium tracking-tight">
                                        OClocher
                                      </span>
                                    </span>
                                  </div>
                                )}
                                {imageUrl && (
                                  <div className="flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setLightboxUrl(imageUrl);
                                        posthog.capture("source_image_opened", {
                                          church_uuid: church.uuid,
                                          url: imageUrl,
                                        });
                                      }}
                                      aria-label="Voir la source"
                                      className="block w-12 h-12 rounded-lg overflow-hidden border border-ink/10 hover:border-deepblue/40 transition-colors bg-paper"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={imageUrl}
                                        alt="Aperçu de la source"
                                        loading="lazy"
                                        className="w-full h-full object-cover"
                                      />
                                    </button>
                                  </div>
                                )}
                                {pageUrl && (
                                  <Link
                                    href={pageUrl}
                                    target="_blank"
                                    className="text-deepblue/50 hover:text-deepblue block text-right text-[12px]"
                                  >
                                    Source ↗
                                  </Link>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!isLoading && churchDetails && dayKeys.length === 0 && (
            <p className="text-center text-white/55 py-6 text-sm">
              Aucun horaire trouvé,{" "}
              {churchDetails.website?.home_url ? (
                <Link
                  href={churchDetails.website.home_url}
                  target="_blank"
                  className="underline underline-offset-4 decoration-white/30 hover:decoration-white/70 text-white/75 hover:text-white transition-colors"
                  onClick={() =>
                    posthog.capture("parish_website_clicked", {
                      church_uuid: church.uuid,
                      church_name: church.name,
                      parish_url: churchDetails.website?.home_url,
                    })
                  }
                >
                  visitez le site de la paroisse
                </Link>
              ) : (
                "visitez le site de la paroisse"
              )}
            </p>
          )}

          <CommunityFeedback church={church} churchDetails={churchDetails} />
        </div>
      </ModalSheetScroller>
      {portalReady &&
        lightboxUrl &&
        createPortal(
          <div
            className="fixed inset-0 bg-deepblue/90 z-[1000] flex items-center justify-center p-4"
            onClick={() => setLightboxUrl(null)}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              aria-label="Fermer"
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <XIcon size={18} weight="bold" color="white" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxUrl}
              alt="Source"
              className="max-w-full max-h-full object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
            <Link
              href={lightboxUrl}
              target="_blank"
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-4 inline-flex items-center gap-1.5 text-white/75 hover:text-white text-[13px] underline underline-offset-4 decoration-white/30 hover:decoration-white/70 transition-colors"
            >
              Ouvrir dans un nouvel onglet
              <ArrowSquareOutIcon size={14} weight="bold" />
            </Link>
          </div>,
          document.body,
        )}
    </>
  );
};

export { ChurchCard };
