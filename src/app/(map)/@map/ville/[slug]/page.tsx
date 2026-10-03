import { Suspense } from "react";
import { CITIES, findCityBySlug } from "@/cities";
import { HomePage } from "../../default";

export const revalidate = 86400;

export function generateStaticParams() {
  return CITIES.map((c) => ({ slug: c.slug }));
}

export default async function CityMapPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const city = findCityBySlug(slug);

  return (
    <Suspense fallback={null}>
      <HomePage serverBounds={city?.bounds ?? null} />
    </Suspense>
  );
}
