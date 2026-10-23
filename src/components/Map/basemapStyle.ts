import { Flavor, layers, namedFlavor } from "@protomaps/basemaps";
import type { LayerSpecification, StyleSpecification } from "maplibre-gl";

// Served by the backend's nginx for every environment (CORS is open), so
// staging and dev read the production tileset.
const TILES_URL = "https://confessio.fr/tiles";

// Neutrals come from the design tokens; road, water and green hues are the
// MapTiler Streets v2 ones, softened so the blue and deep-blue pins stay the
// most saturated things on screen.
const PAPER = "#f7f4ee";
const HAIRLINE = "#e7e3db";
const INK = "#1b2236";
const INK_60 = "#7a7f8f";
const INK_45 = "#9a9da8";

const confessioFlavor: Flavor = {
  ...namedFlavor("light"),
  background: PAPER,
  earth: PAPER,

  park_a: "#dcebcc",
  park_b: "#cfe4bd",
  wood_a: "#dcebcc",
  wood_b: "#cfe4bd",
  scrub_a: "#e2edd0",
  scrub_b: "#d6e7c4",
  zoo: "#dcebcc",
  hospital: "#f6e9e3",
  school: "#eef1ef",
  industrial: "#f1ebdf",
  pedestrian: "#fbf9f4",
  sand: "#f8f0d2",
  beach: "#f8f0d2",
  glacier: "#ffffff",
  aerodrome: "#efece6",
  runway: "#fbf9f4",
  military: "#efece6",
  pier: PAPER,

  water: "#a8d4f5",

  buildings: "#dcd5c8",

  other: "#ffffff",
  minor_service: "#ffffff",
  minor_a: "#ffffff",
  minor_b: "#ffffff",
  link: "#ffeea8",
  major: "#ffeea8",
  highway: "#ffcc85",
  minor_service_casing: "#dad3c6",
  minor_casing: "#dad3c6",
  link_casing: "#e9c28a",
  major_casing_early: "#e9c28a",
  major_casing_late: "#e9c28a",
  highway_casing_early: "#e9ac77",
  highway_casing_late: "#e9ac77",

  tunnel_other: "#f6f3ed",
  tunnel_minor: "#f6f3ed",
  tunnel_link: "#fbf0c8",
  tunnel_major: "#fbf0c8",
  tunnel_highway: "#fbdcae",
  tunnel_other_casing: HAIRLINE,
  tunnel_minor_casing: HAIRLINE,
  tunnel_link_casing: HAIRLINE,
  tunnel_major_casing: HAIRLINE,
  tunnel_highway_casing: HAIRLINE,

  bridges_other: "#ffffff",
  bridges_minor: "#ffffff",
  bridges_link: "#ffeea8",
  bridges_major: "#ffeea8",
  bridges_highway: "#ffcc85",
  bridges_other_casing: HAIRLINE,
  bridges_minor_casing: HAIRLINE,
  bridges_link_casing: "#e9c28a",
  bridges_major_casing: "#e9c28a",
  bridges_highway_casing: "#e9ac77",

  railway: "#c4c2bd",
  boundaries: "#b9b6ae",

  roads_label_minor: INK_60,
  roads_label_minor_halo: "#ffffff",
  roads_label_major: INK_60,
  roads_label_major_halo: "#ffffff",
  address_label: INK_45,
  address_label_halo: PAPER,
  ocean_label: "#4d86b8",
  subplace_label: INK_60,
  subplace_label_halo: PAPER,
  city_label: INK,
  city_label_halo: PAPER,
  state_label: INK_45,
  state_label_halo: PAPER,
  country_label: INK_60,

  landcover: {
    grassland: "#e4eed5",
    barren: "#f6f0e2",
    urban_area: "#f1ede4",
    farmland: "#f1efdc",
    glacier: "#ffffff",
    scrub: "#e6edd3",
    forest: "#d3e6c4",
  },
};

const HIDDEN_LAYERS = new Set(["pois", "roads_shields", "address_label"]);

// Warmer and lighter than MapTiler's #d1cdc2 @ 0.4: without its POI icons the
// buildings are the dominant texture, so they have to stay quieter than there.
const BUILDING_3D = "#d9ceb8";

// Protomaps draws buildings as a flat half-transparent fill, which almost
// vanishes on paper. The flat fill stays under the extrusion so city blocks
// read darker than the white streets; from z15 real OSM heights are extruded
// on top, and the perspective camera shows the walls even unpitched.
function buildingLayers(base: LayerSpecification): LayerSpecification[] {
  if (base.type !== "fill") return [base];
  return [
    {
      ...base,
      paint: {
        "fill-color": "#cfc6b2",
        "fill-opacity": 0.35,
        "fill-outline-color": [
          "interpolate",
          ["linear"],
          ["zoom"],
          13,
          "rgba(205, 202, 198, 0.3)",
          14,
          "#cdcac6",
        ],
      },
    },
    {
      id: "buildings_3d",
      type: "fill-extrusion",
      source: base.source,
      "source-layer": base["source-layer"],
      filter: base.filter,
      minzoom: 15,
      paint: {
        "fill-extrusion-color": BUILDING_3D,
        "fill-extrusion-height": ["coalesce", ["get", "height"], 5],
        "fill-extrusion-base": ["coalesce", ["get", "min_height"], 0],
        "fill-extrusion-opacity": 0.3,
      },
    },
  ];
}

export const basemapStyle: StyleSpecification = {
  version: 8,
  glyphs: `${TILES_URL}/fonts/{fontstack}/{range}.pbf`,
  sprite: `${TILES_URL}/sprites/light`,
  sources: {
    protomaps: {
      type: "vector",
      url: `pmtiles://${TILES_URL}/france.pmtiles`,
      attribution:
        '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: layers("protomaps", confessioFlavor, { lang: "fr" })
    .filter((layer) => !HIDDEN_LAYERS.has(layer.id))
    .flatMap((layer) =>
      layer.id === "buildings" ? buildingLayers(layer) : [layer],
    ),
};
