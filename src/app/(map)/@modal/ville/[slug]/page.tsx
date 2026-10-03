import ModalSheetWrapper from "@/components/ModalSheet/ModalSheetWrapper";
import { fetchChurchesWithWebsites, appTodayKey } from "@/utils";
import { CITIES, cityLocative, findCityBySlug } from "@/cities";

export const revalidate = 86400;

export function generateStaticParams() {
  return CITIES.map((c) => ({ slug: c.slug }));
}

export default async function CityModalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const city = findCityBySlug(slug);

  if (!city) {
    return <ModalSheetWrapper originalSearchResults={{ aggregations: [], churches: [] }} />;
  }

  const { bounds } = city;
  const initialSearchResults = await fetchChurchesWithWebsites({
    min_lat: bounds.south,
    max_lat: bounds.north,
    min_lng: bounds.west,
    max_lng: bounds.east,
    date_filter: appTodayKey(),
  });

  return (
    <ModalSheetWrapper
      originalSearchResults={initialSearchResults}
      heading={`Horaires de confession ${cityLocative(city.name)}`}
    />
  );
}
