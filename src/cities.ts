import { cache } from "react";
import { components } from "./types";
import { Bounds, fetchApi } from "./utils";

export type City = components["schemas"]["CityOut"];

const CITY_COUNT = 100;

// The API sorts communes by population, most populous first.
export const fetchCities = cache(async (): Promise<City[]> => {
  return fetchApi(`/cities?limit=${CITY_COUNT}`, { cache: "force-cache" });
});

export const fetchCityBySlug = cache(
  async (slug: string): Promise<City | null> => {
    const cities = await fetchCities();
    return cities.find((c) => c.slug === slug) ?? null;
  },
);

// The API only gives a commune's center, so the box is sized from population
// (area grows with population at roughly constant density). Fitted against the
// communes' real bounding boxes; the cap keeps dense communes like Paris from
// swallowing their suburbs.
const KM_PER_SQRT_THOUSAND_PEOPLE = 0.36;
const MIN_HALF_SIZE_KM = 1.5;
const MAX_HALF_SIZE_KM = 6;
const KM_PER_DEGREE_LAT = 111;

export const cityToBounds = (city: City): Bounds => {
  const halfSizeKm = Math.min(
    MAX_HALF_SIZE_KM,
    Math.max(
      MIN_HALF_SIZE_KM,
      KM_PER_SQRT_THOUSAND_PEOPLE * Math.sqrt(city.population / 1000),
    ),
  );
  const halfLat = halfSizeKm / KM_PER_DEGREE_LAT;
  const halfLng =
    halfSizeKm /
    (KM_PER_DEGREE_LAT * Math.cos((city.latitude * Math.PI) / 180));
  return {
    south: city.latitude - halfLat,
    north: city.latitude + halfLat,
    west: city.longitude - halfLng,
    east: city.longitude + halfLng,
  };
};

// "à Paris", but "au Havre" / "au Mans".
export const cityLocative = (name: string): string =>
  name.startsWith("Le ") ? `au ${name.slice(3)}` : `à ${name}`;
