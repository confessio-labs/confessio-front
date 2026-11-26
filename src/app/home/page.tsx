import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  CaretDownIcon,
  PhoneIcon,
} from "@phosphor-icons/react/dist/ssr";
import { HomeSearch } from "./HomeSearch";
import { HeroActions, LocateButton } from "./HeroActions";
import { ShareSiteButton } from "./ShareSiteButton";
import {
  CLOSING_ID,
  HERO_ID,
  OpenQuestionLink,
  SEARCH_ID,
  SearchCtaButton,
  SearchLauncher,
  SearchTextLink,
  StickySearchPill,
} from "./SearchShortcuts";
import { FaqAnswer } from "./FaqAnswer";
import { HomeAnalytics } from "./HomeAnalytics";
import { getHomeContent } from "@/lib/homeContent";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const DIOCESES = [
  { slug: "paris", name: "Paris" },
  { slug: "lyon", name: "Lyon" },
  { slug: "marseille", name: "Marseille" },
  { slug: "toulouse", name: "Toulouse" },
  { slug: "nantes", name: "Nantes" },
  { slug: "versailles", name: "Versailles" },
  { slug: "lille", name: "Lille" },
  { slug: "bordeaux", name: "Bordeaux" },
  { slug: "tours", name: "Tours" },
  { slug: "rennes", name: "Rennes" },
  { slug: "rouen", name: "Rouen" },
  { slug: "angers", name: "Angers" },
  { slug: "dijon", name: "Dijon" },
  { slug: "strasbourg", name: "Strasbourg" },
];

const CONTAINER = "mx-auto w-full max-w-[1200px] px-5 md:px-12";
const SECTION_TITLE =
  "text-[32px] md:text-[44px] leading-[1.08] font-semibold tracking-[-0.02em] text-deepblue";
const EYEBROW =
  "text-[12px] md:text-[13px] font-semibold tracking-[0.08em] uppercase text-deepblue/70";
const FOCUS_RING =
  "outline-none focus-visible:shadow-[0_0_0_3px_rgba(0,92,223,0.18)]";
const FOOTER_LINK =
  "py-2 md:py-0 text-deepblue hover:underline underline-offset-2";

export default async function HomeDraftPage() {
  const content = await getHomeContent();
  const hasStepsQuestion = content.faq.some((entry) => entry.id === "etapes");

  return (
    <main className="bg-paper text-ink">
      <header
        id={HERO_ID}
        className="relative min-h-[85svh] bg-deepblue text-white flex flex-col overflow-hidden"
      >
        <Image
          src="/home-hero.jpg"
          alt=""
          fill
          preload
          sizes="100vw"
          className="object-cover object-[50%_20%] md:object-[50%_30%] mix-blend-luminosity opacity-60"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(36,46,76,0.4)_0%,rgba(36,46,76,0.2)_30%,rgba(36,46,76,0.95)_62%)] md:bg-[linear-gradient(90deg,rgba(36,46,76,0.92)_0%,rgba(36,46,76,0.7)_45%,rgba(36,46,76,0.2)_100%)]" />

        <div
          className={`${CONTAINER} relative pt-5 md:pt-8 flex items-center justify-between`}
        >
          <div className="flex items-center gap-2.5 min-h-11">
            <Image
              src="/confessioLogoWhite.svg"
              alt=""
              width={28}
              height={28}
            />
            <span className="text-[18px] md:text-[20px] font-semibold tracking-[-0.01em]">
              Confessio
            </span>
          </div>
          <a
            href="#qui"
            className={`hidden md:block py-3 text-[15px] text-white/80 hover:text-white rounded-full ${FOCUS_RING}`}
          >
            Qui sommes-nous&nbsp;?
          </a>
        </div>

        <div
          className={`${CONTAINER} relative flex-1 flex flex-col justify-end md:justify-center gap-4 md:gap-7 pt-10 pb-3 md:py-10`}
        >
          <div className="flex flex-col gap-2 md:gap-3.5">
            <p className="text-[46px] md:text-[76px] leading-none font-semibold tracking-[-0.03em]">
              {content.hero_title}
            </p>
            <h1 className="text-[16px] md:text-[20px] leading-snug font-medium text-white/80">
              {content.hero_subtitle}
            </h1>
          </div>
          <div
            id={SEARCH_ID}
            className="w-full max-w-[540px] flex flex-col gap-3"
          >
            <HomeSearch />
            <HeroActions />
          </div>
          <p className="tabular text-[13px] md:text-[14px] text-white/70">
            {content.hero_places}
            <span className="hidden md:inline">
              &nbsp;: {content.hero_places_detail}
            </span>
          </p>
        </div>

        <nav
          aria-label="Sur cette page"
          className={`${CONTAINER} relative pb-1 md:pb-6`}
        >
          <div className="flex gap-5 md:gap-7 border-t border-white/20 md:border-0 pt-1 md:pt-0">
            <a
              href="#attendu"
              className={`inline-flex items-center gap-2 min-h-11 text-[14px] md:text-[15px] font-medium rounded-full ${FOCUS_RING}`}
            >
              Je me prépare
              <ArrowDownIcon size={15} />
            </a>
            <a
              href="#questions"
              className={`inline-flex items-center gap-2 min-h-11 text-[14px] md:text-[15px] font-medium rounded-full ${FOCUS_RING}`}
            >
              Des questions&nbsp;?
              <ArrowDownIcon size={15} />
            </a>
          </div>
        </nav>
      </header>

      {content.news && (
        <aside
          aria-label="Actualité du mois"
          className="bg-white border-b border-hairline"
        >
          <a
            href={content.news.href}
            className={`${CONTAINER} py-4 md:py-5 flex items-center gap-3 md:gap-5 text-deepblue ${FOCUS_RING}`}
          >
            <span className="flex flex-col md:flex-row md:items-center gap-0.5 md:gap-5 flex-1 min-w-0">
              <span className={EYEBROW}>Ce mois-ci</span>
              <span className="text-[15px] md:text-[16px] font-semibold">
                {content.news.title}
              </span>
            </span>
            <ArrowRightIcon size={18} className="shrink-0" />
          </a>
        </aside>
      )}

      <section
        id="attendu"
        data-home-section="attendu"
        className={`${CONTAINER} py-12 md:py-26 flex flex-wrap gap-x-24 gap-y-8 md:gap-y-14`}
      >
        <div className="flex-[1_1_340px] flex flex-col gap-4 md:gap-5">
          <h2 className={SECTION_TITLE}>{content.welcome_title}</h2>
          <p className="max-w-[420px] text-[16px] md:text-[18px] leading-relaxed text-deepblue/80">
            {content.welcome_text}
          </p>
        </div>
        <div className="flex-[999_1_520px] flex flex-col gap-3">
          <h3 className={EYEBROW}>{content.steps_title}</h3>
          <ol className="tabular grid md:grid-cols-2 md:grid-rows-3 md:grid-flow-col md:gap-x-10 border-t border-hairline">
            {content.steps.map((step, index) => (
              <li
                key={index}
                className="flex items-baseline gap-3.5 md:gap-4 py-3.5 md:py-5 border-b border-hairline"
              >
                <span className="w-5 md:w-6 text-[20px] md:text-[26px] font-semibold text-deepblue">
                  {index + 1}
                </span>
                <span className="text-[17px] md:text-[18px] font-semibold text-deepblue">
                  {step}
                </span>
              </li>
            ))}
          </ol>
          {hasStepsQuestion && (
            <div>
              <OpenQuestionLink questionId="etapes">
                {content.steps_link}
                <ArrowDownIcon size={16} />
              </OpenQuestionLink>
            </div>
          )}
        </div>
      </section>

      <section data-home-section="citation" className="bg-deepblue text-white">
        <figure
          className={`${CONTAINER} py-16 md:py-30 flex flex-wrap items-end gap-x-24 gap-y-5 md:gap-y-8`}
        >
          <blockquote className="flex-[999_1_560px] text-[26px] md:text-[40px] leading-[1.2] font-medium tracking-[-0.02em]">
            {content.quote_text}
          </blockquote>
          <figcaption className="flex-[1_1_240px] text-[14px] md:text-[15px] leading-normal text-white/70">
            {content.quote_author}
            <br />
            {content.quote_source}
          </figcaption>
        </figure>
      </section>

      <section
        data-home-section="raisons"
        className="bg-white border-b border-hairline"
      >
        <div
          className={`${CONTAINER} py-14 md:py-28 flex flex-wrap gap-x-24 gap-y-5 md:gap-y-12`}
        >
          <div className="flex-[1_1_320px]">
            <h2
              className={`${SECTION_TITLE} text-[30px] md:text-[44px] max-w-[360px]`}
            >
              {content.reasons_title}
            </h2>
          </div>
          <div className="flex-[999_1_520px] flex flex-col gap-5 md:gap-8">
            <ol className="tabular border-t border-hairline">
              {[...content.reasons, null].map((reason, index) => (
                <li
                  key={index}
                  className="grid grid-cols-[32px_minmax(0,1fr)] md:grid-cols-[48px_minmax(0,1fr)] py-3.5 md:py-4.5 border-b border-hairline text-[16px] md:text-[19px] leading-snug text-deepblue"
                >
                  <span className="font-semibold">{index + 1}</span>
                  <span>
                    {reason ?? (
                      <>
                        Parce que Dieu et un prêtre m&apos;attendent dans
                        l&apos;un des 1&nbsp;200 lieux{" "}
                        <SearchTextLink>répertoriés ici</SearchTextLink>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ol>
            <div className="flex flex-col md:items-start">
              <SearchCtaButton>{content.reasons_cta}</SearchCtaButton>
            </div>
          </div>
        </div>
      </section>

      <section
        id="questions"
        data-home-section="questions"
        className={`${CONTAINER} py-14 md:py-28 flex flex-wrap gap-x-24 gap-y-7 md:gap-y-12`}
      >
        <div className="flex-[1_1_320px]">
          <h2 className={SECTION_TITLE}>{content.faq_title}</h2>
        </div>
        <div className="flex-[999_1_520px] divide-y divide-hairline border-y border-hairline">
          {content.faq.map((entry) => (
            <details
              key={entry.id}
              id={entry.id}
              data-faq-id={entry.id}
              className="group scroll-mt-6"
            >
              <summary
                className={`flex items-center justify-between gap-4 py-4 md:py-5 cursor-pointer list-none text-deepblue text-[16px] md:text-[18px] font-semibold tracking-[-0.01em] rounded-xl [&::-webkit-details-marker]:hidden ${FOCUS_RING}`}
              >
                {entry.question}
                <CaretDownIcon
                  size={18}
                  className="shrink-0 text-deepblue/60 transition-transform duration-200 ease-in-out group-open:rotate-180 motion-reduce:transition-none"
                />
              </summary>
              <FaqAnswer html={entry.answerHtml} />
            </details>
          ))}
        </div>
      </section>

      {/* ph-no-capture keeps this block out of autocapture and session replays:
          whether someone reached for the abuse hotline is never recorded. */}
      <section
        id="abus"
        className={`ph-no-capture ${CONTAINER} pb-14 md:pb-28 scroll-mt-6`}
      >
        <div className="rounded-2xl border border-hairline bg-white px-5 py-6 md:p-10 flex flex-wrap gap-x-24 gap-y-3.5 md:gap-y-6">
          <h2 className="flex-[1_1_280px] text-[24px] md:text-[28px] leading-tight font-semibold tracking-[-0.015em] text-deepblue">
            En cas d&apos;abus
          </h2>
          <div className="flex-[999_1_520px] max-w-[640px] flex flex-col gap-3.5 md:gap-4 text-[15px] md:text-[16px] leading-relaxed">
            <p>
              L&apos;Église encadre strictement le rôle du confesseur et
              l&apos;accompagne. Pour prévenir ensemble les abus, consultez les
              repères des confesseurs.
            </p>
            <p>
              En cas d&apos;abus, contactez la ligne nationale d&apos;écoute,
              gérée par l&apos;association indépendante France Victimes et
              mandatée par la Conférence des évêques de France&nbsp;:
            </p>
            <div className="flex flex-col md:flex-row md:items-baseline gap-2.5 md:gap-8">
              <a
                href="tel:+33141834217"
                className={`tabular h-12 md:h-auto rounded-full md:rounded-none border md:border-0 border-hairline flex items-center justify-center gap-2.5 text-[17px] md:text-[22px] font-semibold text-deepblue ${FOCUS_RING}`}
              >
                <PhoneIcon size={18} className="md:hidden" />
                01 41 83 42 17
              </a>
              <a
                href="mailto:paroledevictimes@cef.fr"
                className={`h-12 md:h-auto rounded-full md:rounded-none border md:border-0 border-hairline flex items-center justify-center text-[15px] md:text-[17px] font-semibold text-deepblue md:underline underline-offset-4 ${FOCUS_RING}`}
              >
                paroledevictimes@cef.fr
              </a>
            </div>
            <p className="tabular text-[13px] md:text-[14px] text-deepblue/70">
              7&nbsp;jours sur 7, de 9&nbsp;h à 21&nbsp;h
            </p>
          </div>
        </div>
      </section>

      <section
        id="qui"
        data-home-section="qui"
        className="bg-white border-t border-hairline"
      >
        <div
          className={`${CONTAINER} py-14 md:py-26 flex flex-wrap gap-x-24 gap-y-4 md:gap-y-12`}
        >
          <div className="flex-[1_1_320px]">
            <h2 className={SECTION_TITLE}>{content.about_title}</h2>
          </div>
          <div className="flex-[999_1_520px] max-w-[640px] flex flex-col gap-4 md:gap-5">
            <p className="text-[18px] md:text-[20px] leading-normal text-deepblue">
              {content.about_lead}
            </p>
            <p className="text-[15px] md:text-[16px] leading-relaxed text-ink/80">
              {content.about_text}
            </p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 pt-2">
              <a
                href="https://confessio.fr/contact"
                className={`h-12 px-5 rounded-full bg-deepblue text-white text-[16px] font-semibold flex items-center justify-center ${FOCUS_RING}`}
              >
                {content.about_contact_label}
              </a>
              <ShareSiteButton />
            </div>
            <a
              href="https://hozana.org"
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-4 rounded-2xl bg-deepblue px-5 py-5 md:px-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 ${FOCUS_RING}`}
            >
              <span className="text-[14px] md:text-[15px] text-white/75">
                Un projet généreusement encouragé par
              </span>
              <Image
                src="/hozana-logo-white.png"
                alt="Hozana"
                width={152}
                height={32}
              />
            </a>
          </div>
        </div>
      </section>

      <section
        id={CLOSING_ID}
        data-home-section="fin"
        className="bg-deepblue text-white"
      >
        <div
          className={`${CONTAINER} py-16 md:py-26 flex flex-wrap items-center gap-x-24 gap-y-5 md:gap-y-8`}
        >
          <h2 className="flex-[1_1_320px] text-[40px] md:text-[56px] leading-[1.02] font-semibold tracking-[-0.025em]">
            {content.closing_title}
          </h2>
          <div className="flex-[999_1_520px] flex flex-col md:flex-row gap-2.5 md:gap-3">
            <SearchLauncher />
            <LocateButton className="md:h-[60px]" />
          </div>
        </div>
      </section>

      <footer
        className={`${CONTAINER} pt-12 md:pt-18 pb-24 md:pb-12 flex flex-col gap-8 md:gap-12`}
      >
        <nav
          aria-label="Confession par diocèse"
          className="flex flex-col gap-3 md:gap-4"
        >
          <h2 className="text-[15px] font-semibold text-deepblue">
            Se confesser près de chez vous
          </h2>
          <ul className="grid grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-4 md:gap-x-6 md:gap-y-2.5 text-[15px]">
            {DIOCESES.map((diocese) => (
              <li key={diocese.slug}>
                <a
                  href={`/diocese/${diocese.slug}`}
                  className="block py-2 md:py-0 text-deepblue hover:underline underline-offset-2"
                >
                  <span className="hidden md:inline">Confession à </span>
                  {diocese.name}
                </a>
              </li>
            ))}
            <li>
              <a
                href="/dioceses"
                className="block py-2 md:py-0 font-semibold text-deepblue hover:underline underline-offset-2"
              >
                Tous les diocèses
              </a>
            </li>
          </ul>
        </nav>
        <div className="pt-5 md:pt-6 border-t border-hairline flex flex-col md:flex-row md:items-baseline md:justify-between gap-1 md:gap-6 text-[14px] text-deepblue/70">
          <div className="flex flex-col md:flex-row md:flex-wrap gap-x-6">
            <a href="https://confessio.fr/contact" className={FOOTER_LINK}>
              Nous contacter
            </a>
            <a href="#abus" className={FOOTER_LINK}>
              En cas d&apos;abus
            </a>
            <a
              href="https://confessio.fr/accounts/login/"
              className={FOOTER_LINK}
            >
              Espace paroisses
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.hdgdev.confession"
              target="_blank"
              rel="noopener noreferrer"
              className={FOOTER_LINK}
            >
              Application Android
            </a>
            <a href="https://confessio.fr/api/docs" className={FOOTER_LINK}>
              API
            </a>
            <a href="https://github.com/confessio-labs" className={FOOTER_LINK}>
              Code source
            </a>
          </div>
          <a
            href="https://unsplash.com/photos/sunlight-streaming-through-the-windows-of-a-church-z61Wwrosyzs"
            target="_blank"
            rel="noopener noreferrer"
            className="pt-3 md:pt-0 shrink-0 text-right hover:underline underline-offset-2"
          >
            Photo&nbsp;: Stamatia Massokosta / Unsplash
          </a>
        </div>
      </footer>

      <StickySearchPill />
      <HomeAnalytics />
    </main>
  );
}
