"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { buttonClasses } from "@/components/ui/Button";
import { SectionIntro } from "./SectionIntro";
import { HERITAGE_EASE, REVEAL_VIEWPORT } from "./reveal";

/**
 * Avatar strip for the five historical characters — arched portrait frames
 * (a nod to Al Fahidi doorways) linking to /characters. Falls back to a
 * lettermark tile when an illustration is missing.
 */

const CHARACTERS = [
  { slug: "pearl-diver", key: "pearlDiver" },
  { slug: "textile-merchant", key: "textileMerchant" },
  { slug: "master-builder", key: "masterBuilder" },
  { slug: "umm-rashid", key: "ummRashid" },
  { slug: "historian-guide", key: "historianGuide" },
] as const;

export function CharactersTeaser() {
  const t = useTranslations("landing.characters");
  const reduce = useReducedMotion() ?? false;
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  return (
    <section
      aria-labelledby="characters-title"
      className="mx-auto w-full max-w-6xl px-6 py-24"
    >
      <SectionIntro
        id="characters-title"
        align="center"
        kicker={t("kicker")}
        title={t("title")}
        description={t("description")}
      />

      <ul className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
        {CHARACTERS.map(({ slug, key }, i) => {
          const name = t(`items.${key}.name`);
          return (
            <motion.li
              key={slug}
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={REVEAL_VIEWPORT}
              transition={{
                duration: 0.55,
                delay: i * 0.07,
                ease: HERITAGE_EASE,
              }}
            >
              <Link
                href="/characters"
                className="group flex flex-col items-center gap-3 text-center"
              >
                <span className="block w-full max-w-40 overflow-hidden rounded-t-pill rounded-b-xs border border-(--line-soft) bg-(--surface) transition-colors duration-200 ease-heritage group-hover:border-gold">
                  <span className="block aspect-[3/4] w-full">
                    {failed[slug] ? (
                      <span
                        aria-hidden
                        className="flex h-full w-full items-center justify-center text-4xl font-bold text-gold"
                      >
                        {name.charAt(0)}
                      </span>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element -- pre-styled SVG asset, no optimization needed
                      <img
                        src={`/images/characters/${slug}.svg`}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                        onError={() =>
                          setFailed((prev) => ({ ...prev, [slug]: true }))
                        }
                      />
                    )}
                  </span>
                </span>
                <span className="flex flex-col gap-1">
                  <span className="font-semibold transition-colors duration-200 ease-heritage group-hover:text-gold-bright">
                    {name}
                  </span>
                  <span className="text-xs leading-relaxed opacity-70">
                    {t(`items.${key}.role`)}
                  </span>
                </span>
              </Link>
            </motion.li>
          );
        })}
      </ul>

      <div className="mt-12 flex justify-center">
        <Link href="/characters" className={buttonClasses("outline", "md")}>
          {t("cta")}
        </Link>
      </div>
    </section>
  );
}
