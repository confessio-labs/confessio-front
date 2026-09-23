"use client";
import { Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { ChurchCard } from "./ChurchCard";
import ModalSheetScroller from "./ModalSheet/ModalSheetScroller";
import ModalSheetDragZone from "./ModalSheet/ModalSheetDragZone";
import { AggregatedSearchResults } from "@/utils";
import ChurchTile from "./ChurchTile";
import DateFilterRail, { StaticDateFilterRail } from "./DateFilterRail";
import { components } from "@/types";
import { useSearchResults } from "@/hooks/useSearchResults";
import { useDateFilter } from "@/hooks/useDateFilter";

const WEEKDAYS = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];
const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

const dateHeadingSuffix = (date: Date | null) => {
  if (!date) return "";
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / 86400000,
  );
  if (diffDays === 0) return "aujourd'hui";
  if (diffDays === 1) return "demain";
  return `${WEEKDAYS[target.getDay()]} ${target.getDate()} ${MONTHS[target.getMonth()]}`;
};

type Churches = AggregatedSearchResults["churches"] | undefined;

const SheetHeading = ({
  date,
  placeName,
}: {
  date: Date | null;
  placeName?: string;
}) => (
  <h1 className="text-base md:text-lg font-semibold text-white px-4">
    {["Horaires de confession", placeName, dateHeadingSuffix(date)]
      .filter(Boolean)
      .join(" ")}
  </h1>
);

const LiveSheetHeading = ({ placeName }: { placeName?: string }) => {
  const { data: searchResults } = useSearchResults();
  const { date } = useDateFilter();
  // The place names the server snapshot; once the map drives the results it
  // no longer describes what is listed.
  return (
    <SheetHeading
      date={date}
      placeName={searchResults ? undefined : placeName}
    />
  );
};

const ChurchList = ({
  churches,
  query,
}: {
  churches: Churches;
  query: string;
}) => (
  <>
    {churches?.map((church) => (
      <ChurchTile key={church.uuid} church={church} query={query} />
    ))}
  </>
);

const LiveChurchList = ({ originalChurches }: { originalChurches: Churches }) => {
  const { data: searchResults } = useSearchResults();
  const query = useSearchParams().toString();
  return (
    <ChurchList
      churches={searchResults ? searchResults.churches : originalChurches}
      query={query}
    />
  );
};

// Every URL-reading part sits in its own Suspense whose fallback renders the
// server snapshot: on statically prerendered routes (/diocese/[slug])
// useSearchParams bails out to the nearest boundary, and the fallback is what
// ends up in the HTML crawlers read.
function ModalSheet({
  originalSearchResults,
  selectedChurch,
  placeName,
}: {
  originalSearchResults?: AggregatedSearchResults | null | undefined;
  selectedChurch?: components["schemas"]["ChurchDetails"];
  placeName?: string;
}) {
  if (selectedChurch) return <ChurchCard church={selectedChurch} />;

  const originalChurches = originalSearchResults?.churches;

  return (
    <>
      <ModalSheetDragZone>
        <div className="flex flex-col gap-2 py-2">
          <Suspense
            fallback={<SheetHeading date={null} placeName={placeName} />}
          >
            <LiveSheetHeading placeName={placeName} />
          </Suspense>
        </div>
      </ModalSheetDragZone>
      <Suspense fallback={<StaticDateFilterRail />}>
        <DateFilterRail />
      </Suspense>
      <hr className="text-gray-500 mt-2" />
      <ModalSheetScroller draggableAt="top">
        <div className="p-4 space-y-4">
          <Suspense
            fallback={<ChurchList churches={originalChurches} query="" />}
          >
            <LiveChurchList originalChurches={originalChurches} />
          </Suspense>
          <div className="flex items-center justify-center gap-2 py-4">
            <span className="text-white text-xs">Un projet généreusement encouragé par</span>
            <a href="https://hozana.org" target="_blank" rel="noopener noreferrer">
              <Image src="/hozana-logo-white.png" alt="Hozana" height={16} width={64} />
            </a>
          </div>
        </div>
      </ModalSheetScroller>
    </>
  );
}

export default ModalSheet;
