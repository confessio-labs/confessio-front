import { cookies, draftMode } from "next/headers";
import sanitizeHtml from "sanitize-html";
import { z } from "zod";
import defaultContent from "@/app/home/content.default.json";

export const HOME_CONTENT_TAG = "home-content";
export const PREVIEW_VERSION_COOKIE = "cms_preview_version";

const text = z.string().trim().min(1);

const RawHomeContent = z.object({
  hero_title: text,
  hero_subtitle: text,
  hero_places: text,
  hero_places_detail: text,
  news_visible: z.boolean().nullish(),
  news_title: z.string().nullish(),
  news_link: z.string().nullish(),
  welcome_title: text,
  welcome_text: text,
  steps_title: text,
  steps: z.array(z.object({ label: text })).min(1),
  steps_link: text,
  quote_text: text,
  quote_author: text,
  quote_source: text,
  reasons_title: text,
  reasons: z.array(z.object({ text })),
  reasons_cta: text,
  faq_title: text,
  faq: z.array(
    z.object({
      id: z.string().nullish(),
      question: text,
      answer: z.string(),
    }),
  ),
  about_title: text,
  about_lead: text,
  about_text: text,
  about_contact_label: text,
  closing_title: text,
});

type RawHomeContent = z.infer<typeof RawHomeContent>;

export type FaqEntry = { id: string; question: string; answerHtml: string };

export type HomeContent = Omit<
  RawHomeContent,
  "news_visible" | "news_title" | "news_link" | "steps" | "reasons" | "faq"
> & {
  news: { title: string; href: string } | null;
  steps: string[];
  reasons: string[];
  faq: FaqEntry[];
};

// French typography: keep guillemets, high punctuation and digit groups
// ("1 200") on the same line as the word they belong to.
const bindFrenchSpaces = (value: string) =>
  value
    .replace(/« /g, "« ")
    .replace(/ ([»:;?!])/g, " $1")
    .replace(/(\d) (?=\d{3}\b)/g, "$1 ");

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Answers come from the CMS's rich-text editor and are rendered as HTML, so
// only the markup the editor's toolbar can produce gets through.
const sanitizeAnswer = (html: string) =>
  sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "h4",
      "ul",
      "ol",
      "li",
      "a",
    ],
    allowedAttributes: { a: ["href", "target", "rel"], ol: ["start"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      h1: "h4",
      h2: "h4",
      h3: "h4",
      h5: "h4",
      h6: "h4",
      a: (tagName, attribs) => ({
        tagName,
        attribs: /^https?:/.test(attribs.href ?? "")
          ? { ...attribs, target: "_blank", rel: "noopener noreferrer" }
          : attribs,
      }),
    },
    exclusiveFilter: (frame) =>
      ["p", "h4", "li"].includes(frame.tag) && !frame.text.trim(),
  });

function normalize(raw: RawHomeContent): HomeContent {
  const { news_visible, news_title, news_link, steps, reasons, faq, ...texts } =
    raw;

  const usedIds = new Set<string>();
  const uniqueId = (wanted: string) => {
    let id = wanted || "question";
    for (let n = 2; usedIds.has(id); n++) id = `${wanted}-${n}`;
    usedIds.add(id);
    return id;
  };

  return {
    ...(Object.fromEntries(
      Object.entries(texts).map(([key, value]) => [
        key,
        bindFrenchSpaces(value),
      ]),
    ) as typeof texts),
    news:
      news_visible && news_title?.trim() && news_link?.trim()
        ? { title: bindFrenchSpaces(news_title.trim()), href: news_link.trim() }
        : null,
    steps: steps.map((step) => bindFrenchSpaces(step.label)),
    reasons: reasons.map((reason) => bindFrenchSpaces(reason.text)),
    faq: faq.map((entry) => ({
      id: uniqueId(slugify(entry.id?.trim() || entry.question)),
      question: bindFrenchSpaces(entry.question),
      answerHtml: bindFrenchSpaces(sanitizeAnswer(entry.answer)),
    })),
  };
}

// Draft Mode makes this fetch skip the cache, so a preview always shows the
// latest saved draft.
async function fetchFromCms(version: string | undefined): Promise<unknown> {
  const baseUrl = process.env.CMS_URL;
  const token = process.env.CMS_TOKEN;
  if (!baseUrl || !token) return null;

  const query = version ? `?version=${encodeURIComponent(version)}` : "";
  try {
    const response = await fetch(`${baseUrl}/items/home${query}`, {
      headers: { authorization: `Bearer ${token}` },
      next: { revalidate: 3600, tags: [HOME_CONTENT_TAG] },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error(`Home content: CMS answered HTTP ${response.status}`);
      return null;
    }
    return (await response.json()).data;
  } catch (error) {
    console.error("Home content: CMS unreachable", error);
    return null;
  }
}

export async function getHomeContent(): Promise<HomeContent> {
  const { isEnabled: preview } = await draftMode();
  const version = preview
    ? (await cookies()).get(PREVIEW_VERSION_COOKIE)?.value
    : undefined;

  const fromCms = await fetchFromCms(version);
  if (fromCms) {
    const parsed = RawHomeContent.safeParse(fromCms);
    if (parsed.success) return normalize(parsed.data);
    console.error("Home content: invalid CMS content", parsed.error.issues);
  }
  return normalize(RawHomeContent.parse(defaultContent));
}
