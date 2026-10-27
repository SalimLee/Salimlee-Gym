"use client";

import { useEffect, useRef } from "react";
import { HALTUNG, ROUNDS } from "@/content/site";
import { MEDIA } from "@/content/media";
import { gsap, ScrollTrigger, prefersReducedMotion } from "../motion/gsap";
import { useHeavyVideo } from "../motion/useInView";
import { RoundMark } from "../ui/RoundMark";
import { KiChip } from "../ui/KiChip";

const media = MEDIA as Record<string, any>;

/**
 * Runde 02 — Haltung (B.6.2), fixiert über 260 vh.
 * 0–15 %: Worte als Kontur, Video unscharf · 15–75 %: je ein Wort füllt sich von
 * links, die Unschärfe nimmt ab · 75–100 %: alle gefüllt, Schlusszeile, Video scharf.
 */
export function Haltung() {
  const rootRef = useRef<HTMLElement>(null);
  const [mediaRef, near] = useHeavyVideo<HTMLDivElement>();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const words = root.querySelectorAll<HTMLElement>("[data-word]");
    const blur = root.querySelector<HTMLElement>("[data-blur]");
    const closing = root.querySelector<HTMLElement>("[data-closing]");

    if (prefersReducedMotion()) {
      words.forEach((w) => w.style.setProperty("--fill", "100%"));
      if (blur) blur.style.opacity = "0";
      if (closing) closing.style.opacity = "1";
      return;
    }

    const ctx = gsap.context(() => {
      const st = ScrollTrigger.create({
        trigger: root,
        start: "top top",
        end: "bottom bottom",
        pin: root.querySelector("[data-stage]"),
        pinSpacing: false,
        scrub: true,
        onUpdate: (self) => {
          const p = self.progress;

          // 15–75 %: drei Worte nacheinander füllen
          const span = 0.6 / words.length;
          words.forEach((w, i) => {
            const from = 0.15 + i * span;
            const local = Math.min(1, Math.max(0, (p - from) / span));
            w.style.setProperty("--fill", `${local * 100}%`);
          });

          // Unschärfe nimmt mit dem Fortschritt ab
          if (blur)
            blur.style.opacity = String(Math.min(1, Math.max(0, 1 - p / 0.75)));

          // Schlusszeile ab 75 %
          if (closing) {
            closing.style.opacity = String(
              Math.min(1, Math.max(0, (p - 0.75) / 0.15)),
            );
          }
        },
      });
      return () => st.kill();
    }, root);

    return () => ctx.revert();
  }, []);

  const h = media.haltung ?? {};

  return (
    <section
      ref={rootRef}
      id="haltung"
      className="sl-haltung"
      aria-labelledby="sl-haltung-h2"
    >
      <div className="sl-haltung-stage" data-stage>
        <div className="sl-haltung-media" ref={mediaRef}>
          {h.poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={h.poster}
              alt=""
              aria-hidden="true"
              className="sl-video-layer"
              loading="lazy"
              decoding="async"
            />
          ) : null}
          {h.video && near ? (
            <video
              className="sl-video-layer"
              muted
              playsInline
              loop
              autoPlay
              preload="none"
              aria-hidden="true"
              poster={h.poster}
            >
              <source src={h.video} type="video/mp4" />
            </video>
          ) : null}
          {h.posterBlur ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={h.posterBlur}
              alt=""
              aria-hidden="true"
              className="sl-video-layer sl-video-blur"
              data-blur
            />
          ) : null}
          <div className="sl-video-layer sl-haltung-scrim" aria-hidden="true" />
        </div>

        <div className="sl-haltung-content sl-wrap">
          <h2 id="sl-haltung-h2" className="sl-haltung-words">
            {HALTUNG.words.map((w) => (
              <span key={w} className="sl-display-words sl-word" data-word>
                {w}
              </span>
            ))}
          </h2>
          <p className="sl-lead sl-haltung-closing" data-closing>
            {HALTUNG.closing}
          </p>
        </div>

        <RoundMark label={ROUNDS.haltung} className="sl-haltung-round" />
        <KiChip className="sl-haltung-ki" />
      </div>
    </section>
  );
}
