"use client";
import { AggregatedSearchResults } from "@/utils";
import { useMapRouter } from "@/hooks/useMapRouter";
import Link from "next/link";
import { memo, type MouseEvent } from "react";

// Building a formatter is costly; toLocaleDateString builds one on every call,
// which adds up across every event of every tile.
const dayLabelFormat = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
});

const formatDayLabel = (dateString: string) => {
  const parts = dayLabelFormat
    .format(new Date(dateString))
    .replace(".", "")
    .split(" ");
  const weekday = parts[0] ?? "";
  const day = parts.slice(1).join(" ");
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${day}`;
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  if (minutes === 0) return `${hours}h`;
  return `${hours}h${minutes.toString().padStart(2, "0")}`;
};

type Church = AggregatedSearchResults["churches"][number];

export const ChurchTileView = ({
  church,
  href,
  onClick,
}: {
  church: Church;
  href: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) => {
  const events = church.eventsByDay;
  if (events === undefined || Object.keys(events).length === 0) return null;
  const entries = Object.entries(events);
  const totalEvents = entries.reduce((sum, [, e]) => sum + e.length, 0);
  const soleEvent =
    totalEvents === 1 ? entries[0]?.[1][0] ?? null : null;

  return (
    <Link
      href={href}
      prefetch={false}
      onClick={onClick}
      className="w-full bg-paper border border-hairline rounded-2xl px-4 py-3 block transition-shadow hover:shadow-[0_4px_14px_-6px_rgba(36,46,76,0.18)] active:scale-[0.995]"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-deepblue text-[17px] leading-tight tracking-[-0.01em]">
            {church.name}
          </h3>
          <p className="text-[12.5px] text-deepblue/55 mt-0.5">
            {church.address}
          </p>
        </div>
        {soleEvent && (
          <div className="shrink-0 flex flex-col items-center gap-1.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-deepblue/55">
              {formatDayLabel(soleEvent.start)}
            </span>
            <span className="tabular inline-flex items-center justify-center rounded-full bg-deepblue text-white px-3 py-1 text-[13px] font-semibold min-w-[54px]">
              {formatTime(soleEvent.start)}
            </span>
          </div>
        )}
      </div>
      {!soleEvent && (
        <div className="mt-3 -mx-1 flex gap-3 overflow-x-auto scrollbar-hide px-1">
          {entries.flatMap(([day, dayEvents]) =>
            dayEvents.map((event, eventIdx) => ({
              key: `${day}-${eventIdx}`,
              event,
            })),
          ).map(({ key, event }, flatIdx) => (
            <div
              key={key}
              className="flex flex-col items-center gap-1.5 shrink-0"
            >
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-deepblue/55">
                {formatDayLabel(event.start)}
              </span>
              <span
                className={
                  flatIdx === 0
                    ? "tabular inline-flex items-center justify-center rounded-full bg-deepblue text-white px-3 py-1 text-[13px] font-semibold min-w-[54px]"
                    : "tabular inline-flex items-center justify-center rounded-full border border-hairline bg-white text-deepblue px-3 py-1 text-[13px] font-semibold min-w-[54px]"
                }
              >
                {formatTime(event.start)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Link>
  );
};
const ChurchTile = ({ church }: { church: Church }) => {
  const router = useMapRouter();
  const href = `/church/${church.uuid}`;
  // The query (bounds, date) is read at click time: subscribing to search
  // params would re-render every tile on every map pan, since bounds live in
  // the URL. Modified clicks fall through to the plain href.
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    router.push(`${href}${window.location.search}`);
  };
  return <ChurchTileView church={church} href={href} onClick={handleClick} />;
};

export default memo(ChurchTile);
