import type { Layer } from "leaflet";

type GlMap = {
  once(type: "load", listener: () => void): unknown;
  on(type: "error", listener: (event: { error?: Error }) => void): unknown;
};

export type BasemapLayer = {
  layer: Layer;
  // Only callable once the layer has been added to the map.
  getGlMap: () => GlMap;
};
