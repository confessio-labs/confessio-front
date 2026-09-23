"use client";

import { Suspense } from "react";
import ModalSheet from "../ModalSheet";
import { AggregatedSearchResults } from "@/utils";
import { components } from "@/types";

function ModalSheetWrapper({
  originalSearchResults,
  selectedChurch,
  placeName,
}: {
  originalSearchResults?: AggregatedSearchResults | null | undefined;
  selectedChurch?: components["schemas"]["ChurchDetails"];
  placeName?: string;
}) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ModalSheet
        originalSearchResults={originalSearchResults}
        selectedChurch={selectedChurch}
        placeName={placeName}
      />
    </Suspense>
  );
}

export default ModalSheetWrapper;
