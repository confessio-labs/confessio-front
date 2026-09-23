import ModalSheetWrapper from "@/components/ModalSheet/ModalSheetWrapper";
import {
  fetchDioceseBySlug,
  fetchDioceses,
  fetchDioceseTodaySnapshot,
  inDioceseLabel,
} from "@/utils";

export const revalidate = false;

export async function generateStaticParams() {
  const dioceses = await fetchDioceses();
  return dioceses.map((d) => ({ slug: d.slug }));
}

export default async function DiocesModalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const diocese = await fetchDioceseBySlug(slug);

  if (!diocese) {
    return <ModalSheetWrapper originalSearchResults={{ aggregations: [], churches: [] }} />;
  }

  const initialSearchResults = await fetchDioceseTodaySnapshot(diocese);

  return (
    <ModalSheetWrapper
      originalSearchResults={initialSearchResults}
      placeName={inDioceseLabel(diocese)}
    />
  );
}
