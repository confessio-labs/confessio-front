"use client";

import { SearchInput } from "@/components/SearchInput";
import { type Bounds, parseBoundsParam } from "@/utils";
import { useEffect, useState } from "react";
import { Map as LeafletMap } from "leaflet";
import { CrosshairSimpleIcon, CircleNotchIcon } from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import { useMapBounds } from "@/hooks/useMapBounds";
import { useSearchResults } from "@/hooks/useSearchResults";
import { useAutocomplete } from "@/hooks/useAutocomplete";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { clearNavigationPending } from "@/lib/navigationLock";

const Map = dynamic(() => import("@/components/Map/Map"), {
  loading: () => (
    <div className="h-screen w-screen flex flex-col gap-4 items-center justify-center">
      <CircleNotchIcon size={40} className="animate-spin text-deepblue" />
      <p className="text-deepblue font-medium">Chargement...</p>
    </div>
  ),
  ssr: false,
});

export function HomePage({
  serverBounds,
}: {
  serverBounds?: Bounds | null;
} = {}) {
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { setBounds } = useMapBounds();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const initialBounds = serverBounds ?? parseBoundsParam(searchParams.get("bounds"));

  // Release the navigation lock as soon as the new pathname is committed.
  useEffect(() => {
    clearNavigationPending();
  }, [pathname]);

  const [currentPosition, setCurrentPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isCenteringOnMe, setIsCenteringOnMe] = useState(false);


  const mapCenter = map?.getCenter();

  const { results: autocompleteResults, isLoading: isAutocompleteLoading } =
    useAutocomplete(searchQuery, mapCenter);

  const { data: searchResults } = useSearchResults();

  useEffect(
    function attachMapMoveHandler() {
      const moveEndHandler = () => {
        if (map) {
          const bounds = map.getBounds();
          setBounds({
            south: bounds.getSouth(),
            north: bounds.getNorth(),
            east: bounds.getEast(),
            west: bounds.getWest(),
          });
        }
      };
      map?.addEventListener("moveend", moveEndHandler);
      map?.fire("moveend");
      return () => {
        map?.removeEventListener("moveend", moveEndHandler);
      };
    },
    [map, setBounds],
  );

  const handleCenterOnMe = () => {
    if (!map || isCenteringOnMe) return;
    posthog.capture("center_on_me_clicked");
    setIsCenteringOnMe(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentPosition({ latitude, longitude });
        map.once("moveend", () => setIsCenteringOnMe(false));
        map.setView([latitude, longitude], 14);
      },
      () => setIsCenteringOnMe(false),
    );
  };

  return (
    <>
      <SearchInput
        map={map}
        isLoading={isAutocompleteLoading}
        results={autocompleteResults}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      <button
        onClick={handleCenterOnMe}
        disabled={isCenteringOnMe}
        className="absolute right-4 bottom-[160px] md:bottom-4 size-12 z-20 bg-deepblue rounded-full flex items-center justify-center cursor-pointer shadow-lg disabled:cursor-default"
      >
        {isCenteringOnMe ? (
          <CircleNotchIcon size={32} color="white" className="animate-spin" />
        ) : (
          <CrosshairSimpleIcon size={32} color="white" />
        )}
      </button>
      <div className="relative z-10 h-screen w-screen">
        <Map
          initialBounds={initialBounds}
          setMap={setMap}
          searchResults={searchResults}
          currentPosition={currentPosition}
        />
      </div>
    </>
  );
}

export default HomePage;
