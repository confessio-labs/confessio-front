import { MaptilerLayer } from "@maptiler/leaflet-maptilersdk";
import { patchGlLayer } from "@/lib/leaflet-active-area";
import type { BasemapLayer } from "./basemapLayer";

const MAP_TILER_API_KEY = process.env.NEXT_PUBLIC_MAP_TILER_API_KEY;
if (MAP_TILER_API_KEY === undefined)
  console.error("MAP_TILER_API_KEY is undefined");

patchGlLayer(MaptilerLayer.prototype, "_maptilerMap");

export const createBasemapLayer = (): BasemapLayer => {
  const layer = new MaptilerLayer({
    apiKey: MAP_TILER_API_KEY || "",
    // The Streets style hardcodes {name:en} on country/state/city/town
    // labels, so without this the map reads "New Aquitaine"/"Dunkirk".
    language: "fr",
  });
  return { layer, getGlMap: () => layer.getMaptilerSDKMap() };
};
