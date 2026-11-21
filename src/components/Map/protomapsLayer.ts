import { MaplibreGL, maplibreGL } from "@maplibre/maplibre-gl-leaflet";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import { patchGlLayer } from "@/lib/leaflet-active-area";
import type { BasemapLayer } from "./basemapLayer";
import { basemapStyle } from "./basemapStyle";

maplibregl.addProtocol("pmtiles", new Protocol().tile);
patchGlLayer(MaplibreGL.prototype, "_glMap");

export const createBasemapLayer = (): BasemapLayer => {
  const layer = maplibreGL({ style: basemapStyle });
  return { layer, getGlMap: () => layer.getMaplibreMap() };
};
