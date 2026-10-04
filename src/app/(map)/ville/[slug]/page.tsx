import { boundsToString } from "@/utils";
import {
  cityLocative,
  cityToBounds,
  fetchCities,
  fetchCityBySlug,
} from "@/cities";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import DioceseRedirect from "../../diocese/[slug]/DioceseRedirect";

export const revalidate = 86400;

export async function generateStaticParams() {
  const cities = await fetchCities();
  return cities.map((c) => ({ slug: c.slug }));
}

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const city = await fetchCityBySlug(slug);
  if (!city) return {};

  const where = cityLocative(city.name);
  const title = `Confession ${where} — horaires et lieux`;
  const description = `Trouvez les horaires de confession ${where}. Églises, horaires et informations pratiques pour se confesser près de chez vous.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Confessio",
    },
  };
}

export default async function CityPage({ params }: Props) {
  const { slug } = await params;
  const city = await fetchCityBySlug(slug);
  if (!city) return notFound();

  return <DioceseRedirect boundsStr={boundsToString(cityToBounds(city))} />;
}
