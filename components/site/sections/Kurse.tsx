"use client";

import { useEffect, useRef, useState } from "react";
import { KURSE } from "@/content/site";
import { MEDIA } from "@/content/media";
import { gsap, prefersReducedMotion } from "../motion/gsap";
import { useAfterLoad, useMediaQuery } from "../motion/useInView";
import type { BookingPreset } from "../SiteShell";

const media = MEDIA as Record<string, any>;

/** Medium je Bahn: echte Clips wo vorhanden, sonst personenfreies Detailbild. */
function laneMedia(id: string): {
  video?: string;
  poster?: string;
  image?: string;
  ki: boolean;
} {
  switch (id) {
    case "erwachsene":
      return {
        video: media.kurse?.erwachsene,
        poster: media.kurse?.erwachsenePoster,
        ki: false,
      };
    case "frauen":
      return { image: media.details?.frauen, ki: true };
    case "kinder":
      return { image: media.details?.kinder, ki: true };
    case "boxtraining":
      return { video: media.technik?.video, poster: media.technik?.poster, ki: false };
    case "personal":
      return {
        video: media.kurse?.personal,
        poster: media.kurse?.personalPoster,
        ki: false,
      };
    default:
      return { ki: false };
  }
}

/**
 * Runde 03 — Kurse (B.6.3): fünf Bahnen als Split-Screen-Akkordeon.
 * Desktop: Hover und Fokus öffnen, erste Bahn ist offen.
 * Mobil: waagerechtes Karussell mit Einrasten (B.7).
 */
export function Kurse({ onBook }: { onBook: (p: BookingPreset) => void }) {
  const rootRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const afterLoad = useAfterLoad();
  // Mobil bleibt es beim Standbild: das Bahnen-Video sind 266 KB auf dem
  // kritischen Pfad, und auf Mobil ist ohnehin jede Bahn offen.
  const wide = useMediaQuery("(min-width: 1024px)");

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.from("[data-lane]", {
        y: 40,
        opacity: 0,
        duration: 0.9,
        stagger: 0.07,
        ease: "expo.out",
        immediateRender: false,
        scrollTrigger: { trigger: root, start: "top 75%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      id="angebote"
      className="sl-section sl-kurse"
      aria-labelledby="sl-kurse-h2"
    >
      <div className="sl-wrap">
        <h2 id="sl-kurse-h2" className="sl-display-lg sl-kurse-h2">
          {KURSE.h2}
        </h2>
        <p className="sl-readout sl-kurse-note">{KURSE.note}</p>
      </div>

      <div className="sl-wrap">
        <div className="sl-lanes" role="list">
          {KURSE.lanes.map((lane, i) => {
            const m = laneMedia(lane.id);
            const open = i === active;
            return (
              <div
                key={lane.id}
                role="listitem"
                data-lane
                className={`sl-lane${open ? " is-open" : ""}`}
                onMouseEnter={() => setActive(i)}
              >
                <button
                  type="button"
                  className="sl-lane-trigger"
                  // Der sichtbare Text ist auf Mobil ausgeblendet — ohne
                  // aria-label hätte der Knopf dort keinen Namen.
                  aria-label={lane.label}
                  aria-expanded={open}
                  aria-controls={`sl-lane-${lane.id}`}
                  onFocus={() => setActive(i)}
                  onClick={() => setActive(i)}
                >
                  <span className="sl-lane-label sl-readout">{lane.label}</span>
                </button>

                <div className="sl-lane-media" aria-hidden="true">
                  {m.video ? (
                    <video
                      src={open && afterLoad && wide ? m.video : undefined}
                      poster={m.poster}
                      muted
                      playsInline
                      loop
                      autoPlay
                      preload="none"
                    />
                  ) : m.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.image} alt="" loading="lazy" decoding="async" />
                  ) : null}
                </div>

                <div
                  id={`sl-lane-${lane.id}`}
                  className="sl-lane-card sl-glass"
                >
                  <h3 className="sl-lane-title">{lane.label}</h3>
                  <p className="sl-readout sl-lane-times">{lane.times}</p>
                  {lane.price ? (
                    <p className="sl-num sl-lane-price">{lane.price}</p>
                  ) : null}
                  <ul className="sl-lane-features">
                    {lane.features.map((f) => (
                      <li key={f} className="sl-readout">
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="sl-btn sl-btn-primary sl-lane-cta"
                    onClick={() => onBook(lane.preselect as BookingPreset)}
                  >
                    {KURSE.cta}
                    <span className="sl-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
