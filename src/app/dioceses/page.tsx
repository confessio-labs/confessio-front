import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";
import { components } from "@/types";
import { fetchDioceses, SITE_URL } from "@/utils";

export const revalidate = 86400;

type Diocese = components["schemas"]["DioceseOut"];

const TITLE = "Horaires de confession par diocèse — Confessio";
const DESCRIPTION =
  "Tous les diocèses de France sur Confessio : choisissez le vôtre pour trouver les horaires et les lieux de confession près de chez vous.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/dioceses" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "Confessio",
    url: "/dioceses",
  },
};

// "Diocèse du Mans" files under M and "Diocèse d'Évry…" under E, the way a
// reader looks for their city, not under D for "Diocèse".
const placeName = (diocese: Diocese) =>
  diocese.name
    .replace(/^(archi)?diocèse\s+/i, "")
    .replace(/^(de la |de l'|de |d'|du )/i, "");

const initialOf = (place: string) =>
  place.normalize("NFD").replace(/[̀-ͯ]/g, "").charAt(0).toUpperCase();

const groupByInitial = (dioceses: Diocese[]) => {
  const sorted = [...dioceses].sort((a, b) =>
    placeName(a).localeCompare(placeName(b), "fr"),
  );
  const groups = new Map<string, Diocese[]>();
  for (const diocese of sorted) {
    const initial = initialOf(placeName(diocese));
    groups.set(initial, [...(groups.get(initial) ?? []), diocese]);
  }
  return [...groups.entries()];
};

const buildJsonLd = (dioceses: Diocese[]) => [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Confessio", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Diocèses",
        item: `${SITE_URL}/dioceses`,
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Horaires de confession par diocèse",
    numberOfItems: dioceses.length,
    itemListElement: dioceses.map((diocese, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: diocese.name,
      url: `${SITE_URL}/diocese/${diocese.slug}`,
    })),
  },
];

const FOCUS_RING =
  "outline-none focus-visible:shadow-[0_0_0_3px_rgba(0,92,223,0.18)]";

export default async function DiocesesPage() {
  const dioceses = await fetchDioceses();
  const groups = groupByInitial(dioceses);

  return (
    <main className="min-h-dvh bg-paper text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildJsonLd(dioceses)),
        }}
      />

      <header className="bg-deepblue text-white">
        <div className="mx-auto w-full max-w-[1200px] px-5 md:px-12 py-4 md:py-5 flex items-center justify-between gap-4">
          <Link
            href="/"
            className={`flex items-center gap-2.5 min-h-11 rounded-full ${FOCUS_RING}`}
          >
            <Image
              src="/confessioLogoWhite.svg"
              alt=""
              width={26}
              height={26}
            />
            <span className="text-[18px] font-semibold tracking-[-0.01em]">
              Confessio
            </span>
          </Link>
          <Link
            href="/"
            className={`h-11 px-4 rounded-full bg-white text-deepblue text-[15px] font-medium flex items-center gap-2 ${FOCUS_RING}`}
          >
            <MagnifyingGlassIcon size={18} />
            <span className="hidden sm:inline">
              Chercher une église ou une ville
            </span>
            <span className="sm:hidden">Chercher</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1200px] px-5 md:px-12 py-10 md:py-20 flex flex-col gap-8 md:gap-14">
        <div className="flex flex-col gap-3 md:gap-4 max-w-[680px]">
          <nav
            aria-label="Fil d'Ariane"
            className="text-[14px] text-deepblue/70"
          >
            <Link href="/" className="hover:underline underline-offset-2">
              Confessio
            </Link>
            <span aria-hidden> / </span>
            <span aria-current="page">Diocèses</span>
          </nav>
          <h1 className="text-[32px] md:text-[44px] leading-[1.08] font-semibold tracking-[-0.02em] text-deepblue">
            Horaires de confession par diocèse
          </h1>
          <p className="text-[16px] md:text-[18px] leading-relaxed text-deepblue/80">
            Confessio réunit les horaires de confession des paroisses,
            sanctuaires et communautés de{" "}
            <span className="tabular">{dioceses.length}</span> diocèses.
            Choisissez le vôtre pour voir les lieux et les prochains créneaux.
          </p>
        </div>

        <div className="columns-1 sm:columns-2 lg:columns-3 gap-x-10">
          {groups.map(([initial, members]) => (
            <section key={initial} className="break-inside-avoid pb-6 md:pb-8">
              <h2 className="pb-2 mb-1 border-b border-hairline text-[13px] font-semibold tracking-[0.08em] text-deepblue/70">
                {initial}
              </h2>
              <ul>
                {members.map((diocese) => (
                  <li key={diocese.slug}>
                    <Link
                      href={`/diocese/${diocese.slug}`}
                      prefetch={false}
                      className="block py-2 text-[16px] text-deepblue hover:underline underline-offset-2"
                    >
                      {diocese.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
