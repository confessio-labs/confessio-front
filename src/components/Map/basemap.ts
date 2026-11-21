import type { Map as LeafletMap } from "leaflet";
import posthog from "posthog-js";
import type { BasemapLayer } from "./basemapLayer";

export type BasemapVariant = "protomaps" | "maptiler";

const FLAG_KEY = "self-hosted-basemap";
const FLAG_TIMEOUT_MS = 1500;
const OVERRIDE_PARAM = "basemap";
const OVERRIDE_STORAGE_KEY = "basemap-override";

// Dev and staging run without PostHog, so no flag ever arrives: they get the
// new basemap straight away. In prod, a flag that doesn't arrive
// in time means the old one.
const POSTHOG_ENABLED =
  process.env.NODE_ENV !== "development" &&
  !!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const DEFAULT_WITHOUT_POSTHOG: BasemapVariant = "protomaps";
const DEFAULT_WITHOUT_FLAG: BasemapVariant = "maptiler";

const loaders: Record<
  BasemapVariant,
  () => Promise<{ createBasemapLayer: () => BasemapLayer }>
> = {
  protomaps: () => import("./protomapsLayer"),
  maptiler: () => import("./maptilerLayer"),
};

const isVariant = (value: unknown): value is BasemapVariant =>
  value === "protomaps" || value === "maptiler";

// ?basemap=protomaps|maptiler forces a variant in this browser until
// ?basemap=auto clears it.
const readOverride = (): BasemapVariant | null => {
  try {
    const param = new URLSearchParams(window.location.search).get(
      OVERRIDE_PARAM,
    );
    if (isVariant(param)) localStorage.setItem(OVERRIDE_STORAGE_KEY, param);
    else if (param === "auto") localStorage.removeItem(OVERRIDE_STORAGE_KEY);
    const stored = localStorage.getItem(OVERRIDE_STORAGE_KEY);
    return isVariant(stored) ? stored : null;
  } catch {
    return null;
  }
};

const waitForFlag = (): Promise<boolean | string | undefined> => {
  const cached = posthog.getFeatureFlag(FLAG_KEY);
  if (cached !== undefined) return Promise.resolve(cached);
  let resolveFlag!: (value: boolean | string | undefined) => void;
  const flag = new Promise<boolean | string | undefined>((resolve) => {
    resolveFlag = resolve;
  });
  const timer = setTimeout(() => resolveFlag(undefined), FLAG_TIMEOUT_MS);
  const unsubscribe = posthog.onFeatureFlags(() =>
    resolveFlag(posthog.getFeatureFlag(FLAG_KEY)),
  );
  return flag.finally(() => {
    clearTimeout(timer);
    unsubscribe();
  });
};

const resolveVariant = async (): Promise<BasemapVariant> => {
  const override = readOverride();
  if (override) return override;
  if (!POSTHOG_ENABLED) return DEFAULT_WITHOUT_POSTHOG;
  const flag = await waitForFlag();
  if (flag === undefined) return DEFAULT_WITHOUT_FLAG;
  return flag === true ? "protomaps" : "maptiler";
};

const addBasemap = async (
  map: LeafletMap,
  assigned: BasemapVariant,
  variant: BasemapVariant,
  onReady: () => void,
) => {
  const { createBasemapLayer } = await loaders[variant]();
  const { layer, getGlMap } = createBasemapLayer();
  layer.addTo(map);
  const glMap = getGlMap();

  let settled = false;
  let errorReported = false;

  glMap.on("error", ({ error }) => {
    if (!errorReported) {
      errorReported = true;
      posthog.capture("basemap_error", {
        variant,
        assigned,
        before_load: !settled,
        message: error?.message,
      });
    }
    // An error before the first render (style, glyphs, archive header) can
    // leave the map blank, so the old basemap takes over. Later errors are
    // single tiles and only get reported.
    if (!settled && variant === "protomaps") {
      settled = true;
      map.removeLayer(layer);
      void addBasemap(map, assigned, "maptiler", onReady).catch(() =>
        onReady(),
      );
    }
  });

  glMap.once("load", () => {
    if (settled) return;
    settled = true;
    posthog.capture("basemap_loaded", {
      variant,
      assigned,
      fell_back: variant !== assigned,
      ms: Math.round(performance.now()),
    });
    onReady();
  });
};

export const mountBasemap = async (map: LeafletMap, onReady: () => void) => {
  const assigned = await resolveVariant();
  posthog.register({ basemap: assigned });
  try {
    await addBasemap(map, assigned, assigned, onReady);
  } catch (error) {
    posthog.capture("basemap_error", {
      variant: assigned,
      assigned,
      before_load: true,
      message: error instanceof Error ? error.message : String(error),
    });
    if (assigned === "protomaps") {
      try {
        await addBasemap(map, assigned, "maptiler", onReady);
        return;
      } catch {}
    }
    onReady();
  }
};
