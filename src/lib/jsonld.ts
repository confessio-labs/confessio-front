import { components } from "@/types";
import { AggregatedSearchResults, SITE_URL } from "@/utils";

const BASE_URL = SITE_URL;

type ChurchDetails = components["schemas"]["ChurchDetails"];
type EventOut = components["schemas"]["EventOut"];

function buildPostalAddress(church: {
  address: string | null;
  zipcode: string | null;
  city: string | null;
}) {
  const address: Record<string, string> = {
    "@type": "PostalAddress",
    addressCountry: "FR",
  };
  if (church.address) address.streetAddress = church.address;
  if (church.zipcode) address.postalCode = church.zipcode;
  if (church.city) address.addressLocality = church.city;
  return address;
}

function buildConfessionEvent(ev: EventOut, churchName: string) {
  const event: Record<string, unknown> = {
    "@type": "Event",
    name: "Confession",
    startDate: ev.start,
    location: { "@type": "Church", name: churchName },
  };
  if (ev.end) event.endDate = ev.end;
  return event;
}

export function buildChurchJsonLd(church: ChurchDetails) {
  const now = new Date();
  const upcomingEvents = church.events
    .filter((ev) => new Date(ev.end ?? ev.start) >= now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 10);

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Church",
    name: church.name,
    url: `${BASE_URL}/church/${church.uuid}`,
    geo: {
      "@type": "GeoCoordinates",
      latitude: church.latitude,
      longitude: church.longitude,
    },
    address: buildPostalAddress(church),
  };

  if (church.website?.home_url) {
    jsonLd.sameAs = [church.website.home_url];
  }

  if (upcomingEvents.length > 0) {
    jsonLd.event = upcomingEvents.map((ev) =>
      buildConfessionEvent(ev, church.name),
    );
  }

  return jsonLd;
}

export function buildDioceseJsonLd(
  inDiocese: string,
  churches: AggregatedSearchResults["churches"],
) {
  const listed = churches.filter(
    (church) => Object.keys(church.eventsByDay ?? {}).length > 0,
  );

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Horaires de confession ${inDiocese}`,
    numberOfItems: listed.length,
    itemListElement: listed.map((church, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Church",
        name: church.name,
        url: `${BASE_URL}/church/${church.uuid}`,
        geo: {
          "@type": "GeoCoordinates",
          latitude: church.latitude,
          longitude: church.longitude,
        },
        address: buildPostalAddress(church),
        event: Object.values(church.eventsByDay ?? {})
          .flat()
          .map((ev) => buildConfessionEvent(ev, church.name)),
      },
    })),
  };
}

export const WEBSITE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Confessio",
  url: BASE_URL,
  description:
    "Trouvez les horaires de confession catholique près de chez vous.",
  inLanguage: "fr",
  publisher: {
    "@type": "Organization",
    name: "Confessio",
    url: BASE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${BASE_URL}/favicon.svg`,
    },
  },
};
