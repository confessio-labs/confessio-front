import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  CaretDownIcon,
  MapTrifoldIcon,
} from "@phosphor-icons/react/dist/ssr";
import { HomeSearch } from "./HomeSearch";
import { FAQ } from "./faq";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// French typography: keep guillemets and high punctuation on the same line as
// the word they belong to.
const bindFrenchSpaces = (text: string) =>
  text.replace(/« /g, "«\u00a0").replace(/ ([»:;?!])/g, "\u00a0$1");

export default function HomeDraftPage() {
  return (
    <main>
      <section className="relative min-h-dvh bg-deepblue flex flex-col items-center justify-center px-4">
        <Image
          src="/home-hero.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-deepblue/70" />
        <div className="relative w-full flex flex-col items-center">
          <Image
            src="/confessioLogoWhite.svg"
            alt="Logo de Confessio"
            width={64}
            height={64}
            priority
          />
          <h1 className="mt-4 text-[40px] leading-tight font-semibold tracking-[-0.01em] text-white">
            Confessio
          </h1>
          <div className="mt-8 w-full max-w-[468px] flex flex-col gap-4">
            <HomeSearch />
            <Link
              href="/"
              className="group h-14 rounded-full bg-white text-deepblue text-[17px] font-semibold tracking-[-0.01em] flex items-center justify-center shadow-[0_4px_14px_-4px_rgba(36,46,76,0.14)] outline-none focus-visible:shadow-[0_0_0_3px_rgba(0,92,223,0.18)]"
            >
              <span className="relative flex items-center gap-2.5 transition-transform duration-200 ease-in-out group-hover:-translate-x-3 group-focus-visible:-translate-x-3 motion-reduce:transition-none">
                <MapTrifoldIcon size={22} />
                Aller directement à la carte
                {/* Absolute so the arrow takes no space: the label stays centered at rest. */}
                <ArrowRightIcon
                  size={18}
                  aria-hidden
                  className="absolute left-full ml-2 opacity-0 -translate-x-2 transition duration-200 ease-in-out group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0 motion-reduce:transition-none"
                />
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-paper px-4 py-16">
        <div className="mx-auto max-w-[680px] divide-y divide-hairline border-y border-hairline">
          {FAQ.map((entry) => (
            <details key={entry.question} className="group">
              <summary className="flex items-center justify-between gap-4 py-5 cursor-pointer list-none text-deepblue text-[17px] font-semibold tracking-[-0.01em] outline-none rounded-xl focus-visible:shadow-[0_0_0_3px_rgba(0,92,223,0.18)] [&::-webkit-details-marker]:hidden">
                {bindFrenchSpaces(entry.question)}
                <CaretDownIcon
                  size={18}
                  className="shrink-0 text-deepblue/55 transition-transform duration-200 ease-in-out group-open:rotate-180 motion-reduce:transition-none"
                />
              </summary>
              <figure className="pb-6 flex flex-col gap-2">
                <blockquote className="text-[15px] leading-relaxed text-ink">
                  <p>{bindFrenchSpaces(entry.answer)}</p>
                </blockquote>
                <figcaption>
                  <a
                    href={entry.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tabular text-[12.5px] text-deepblue/55 underline-offset-2 hover:underline"
                  >
                    {entry.source}
                  </a>
                </figcaption>
              </figure>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
