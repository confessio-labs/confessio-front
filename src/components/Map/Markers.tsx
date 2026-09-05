import {
  AggregatedSearchResults,
  getChurchMarkerLabel,
  summaryToCard,
} from "@/utils";
import L, { Map, Marker as LeafletMarker } from "leaflet";
import { useEffect, useRef } from "react";
import { useSetAtom } from "jotai";
import { useQueryClient } from "@tanstack/react-query";
import { optimisticChurchAtom } from "@/atoms";
import { useMapRouter } from "@/hooks/useMapRouter";
import { useDateFilter } from "@/hooks/useDateFilter";

export const ChurchMarker = ({
  map,
  church,
  selected,
}: {
  map: Map;
  church: AggregatedSearchResults["churches"][number];
  selected: boolean;
}) => {
  const { uuid, latitude, longitude, eventsByDay } = church;
  const router = useMapRouter();
  const setOptimisticChurch = useSetAtom(optimisticChurchAtom);
  const queryClient = useQueryClient();
  const markerRef = useRef<LeafletMarker | null>(null);
  const { date } = useDateFilter();

  // Open the church optimistically: seed the query cache and the optimistic
  // atom from the summary we already have so the sheet renders instantly,
  // then navigate so the server @modal slot loads the full record and takes
  // over on commit. Called through a ref so the marker-creation effect below
  // keeps stable deps (it must not re-run when `church` identity changes).
  const openRef = useRef<() => void>(() => {});
  openRef.current = () => {
    const params = new URLSearchParams(window.location.search);
    params.set("center", `${latitude},${longitude}`);
    // Skip the optimistic swap if this church is already open — the URL
    // wouldn't change, so the atom would never be cleared (it clears on the
    // next committed navigation), stranding the sheet on the summary card.
    if (window.location.pathname !== `/church/${uuid}`) {
      const card = summaryToCard(church);
      queryClient.setQueryData(["churchDetails", uuid], card);
      setOptimisticChurch(card);
    }
    router.push(`/church/${uuid}?${params.toString()}`);
  };

  const firstEventStart = Object.values(eventsByDay || {})?.[0]?.[0]?.start;

  const timeLabel = getChurchMarkerLabel(firstEventStart, date !== null);

  useEffect(() => {
    let marker: LeafletMarker;

    if (timeLabel === null) {
      const emptySize = selected ? 20 : 14;
      const cls = selected
        ? "empty-church-marker-selected"
        : "empty-church-marker";
      marker = L.marker([latitude, longitude], {
        icon: L.divIcon({
          className: "",
          html: `<div class="${cls}"></div>`,
          iconSize: [emptySize, emptySize],
          iconAnchor: [emptySize / 2, emptySize / 2],
        }),
        zIndexOffset: selected ? 1000 : 0,
      })
        .addTo(map)
        .on("click", () => openRef.current());
    } else {
      const markerClass = selected ? "church-marker-selected" : "church-marker";
      marker = L.marker([latitude, longitude], {
        icon: L.divIcon({
          className: "", // needed to remove the default leaflet class
          html: `<div class="${markerClass}">${timeLabel}</div>`,
          // Zero-size anchor at the coordinate; the pill sizes to its content
          // and is centered above the point via CSS transform.
          iconSize: [0, 0],
          iconAnchor: [0, 0],
          popupAnchor: [0, selected ? -34 : -30],
        }),
        zIndexOffset: selected ? 1000 : 0,
      })
        .addTo(map)
        .on("click", () => openRef.current());
    }

    markerRef.current = marker;
    return () => {
      marker.remove();
    };
  }, [map, latitude, longitude, timeLabel, selected]);

  useEffect(() => {
    if (!markerRef.current) return;
    if (selected) {
      markerRef.current.openPopup();
    } else {
      markerRef.current.closePopup();
    }
  }, [selected]);

  return null;
};

export const AggregationMarker = ({
  map,
  aggregation: {
    centroid_latitude,
    centroid_longitude,
    church_count,
    max_latitude,
    min_latitude,
    max_longitude,
    min_longitude,
  },
}: {
  map: Map;
  aggregation: AggregatedSearchResults["aggregations"][number];
}) => {
  useEffect(() => {
    const marker = L.marker([centroid_latitude, centroid_longitude], {
      icon: L.divIcon({
        className: "",
        html: `<div class="aggregation-marker-count">${church_count}</div>`,
        iconSize: [25, 25],
        iconAnchor: [12.5, 25], // from to top left, half the width and half the height
      }),
    })
      .addTo(map)
      .on("click", () => {
        map.flyToBounds([
          [max_latitude, min_longitude],
          [min_latitude, max_longitude],
        ]);
      });

    return () => {
      marker.remove();
    };
  }, [
    map,
    centroid_latitude,
    centroid_longitude,
    church_count,
    max_latitude,
    min_latitude,
    max_longitude,
    min_longitude,
  ]);

  return null;
};

export const CurrentPositionMarker = ({
  map,
  position,
}: {
  map: Map;
  position: { latitude: number; longitude: number };
}) => {
  useEffect(() => {
    const marker = L.marker([position.latitude, position.longitude], {
      icon: L.divIcon({
        className: "current-position-marker",
        html: '<div style="background-color: #007bff; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 2px #007bff;"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      }),
    }).addTo(map);

    return () => {
      marker.remove();
    };
  }, [map, position.latitude, position.longitude]);

  return null;
};
