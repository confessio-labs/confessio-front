"use client";

import { Suspense } from "react";
import ModalSheet, { ChurchListLayout } from "../ModalSheet";
import { ChurchTileView } from "../ChurchTile";
import { DateFilterRailView } from "../DateFilterRail";
import { AggregatedSearchResults } from "@/utils";
import { components } from "@/types";

// The sheet reads search params, so a statically prerendered page bails out to
// this fallback: it is the only list markup crawlers and no-JS visitors get.
function StaticChurchList({
  heading,
  searchResults,
}: {
  heading: string;
  searchResults: AggregatedSearchResults | null | undefined;
}) {
  return (
    <ChurchListLayout
      heading={heading}
      rail={<DateFilterRailView selectedKey={null} onSelect={() => {}} />}
    >
      {searchResults?.churches?.map((church) => (
        <ChurchTileView
          key={church.uuid}
          church={church}
          href={`/church/${church.uuid}`}
        />
      ))}
    </ChurchListLayout>
  );
}

function ModalSheetWrapper({
  originalSearchResults,
  selectedChurch,
  heading = "Horaires de confession",
}: {
  originalSearchResults?: AggregatedSearchResults | null | undefined;
  selectedChurch?: components["schemas"]["ChurchDetails"];
  heading?: string;
}) {
  return (
    <Suspense
      fallback={
        <StaticChurchList
          heading={heading}
          searchResults={originalSearchResults}
        />
      }
    >
      <ModalSheet
        originalSearchResults={originalSearchResults}
        selectedChurch={selectedChurch}
      />
    </Suspense>
  );
}

export default ModalSheetWrapper;
