import { Suspense } from "react";
import { cityToBounds, fetchCities, fetchCityBySlug } from "@/cities";
import { HomePage } from "../../default";

export const revalidate = 86400;

export async function generateStaticParams() {
  const cities = await fetchCities();
  return cities.map((c) => ({ slug: c.slug }));
}

export default async function CityMapPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const city = await fetchCityBySlug(slug);

  return (
    <Suspense fallback={null}>
      <HomePage serverBounds={city ? cityToBounds(city) : null} />
    </Suspense>
  );
}
