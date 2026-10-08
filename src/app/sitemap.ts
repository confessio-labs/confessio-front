import type { MetadataRoute } from "next";
import { fetchChurchesWithWebsites, fetchDioceses, SITE_URL } from "@/utils";
import { fetchCities } from "@/cities";

const BASE_URL = SITE_URL;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ churches }, dioceses, cities] = await Promise.all([
    fetchChurchesWithWebsites({
      min_lat: 41,
      min_lng: -5.5,
      max_lat: 51.5,
      max_lng: 10,
    }),
    fetchDioceses(),
    fetchCities(),
  ]);

  const churchEntries: MetadataRoute.Sitemap = churches.map((church) => ({
    url: `${BASE_URL}/church/${church.uuid}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const dioceseEntries: MetadataRoute.Sitemap = dioceses.map((diocese) => ({
    url: `${BASE_URL}/diocese/${diocese.slug}`,
    lastModified: new Date().toISOString().split("T")[0],
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const cityEntries: MetadataRoute.Sitemap = cities.map((city) => ({
    url: `${BASE_URL}/ville/${city.slug}`,
    lastModified: new Date().toISOString().split("T")[0],
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [
    {
      url: BASE_URL,
      changeFrequency: "daily",
      priority: 1,
    },
    ...dioceseEntries,
    ...cityEntries,
    ...churchEntries,
  ];
}
