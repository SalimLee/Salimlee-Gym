"use client";

import { useEffect, useRef } from "react";
import { KONTAKT, ROUNDS, START } from "@/content/site";
import { MEDIA } from "@/content/media";
import { gsap, ScrollTrigger, prefersReducedMotion } from "../motion/gsap";
import { RoundMark } from "../ui/RoundMark";
import { KiChip } from "../ui/KiChip";
import type { BookingPreset } from "../SiteShell";

const media = MEDIA as Record<string, any>;

/**
 * Runde 08 — Dein Start (B.6.8), kurz fixiert über 160 vh.
 * Große Zeile mit Zeilen-Reveal an den Scroll gebunden, darunter die beiden
 * Sätze und die Buttons (Probetraining vorausgewählt · Anrufen).
 */
export function Start({ onBook }: { onBook: (p: BookingPreset) => void }) {
  const rootRef = useRef<HTMLElement>(null);
  const tel = KONTAKT.info.phone.replace(/\s/g, "");

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: root,
        start: "top top",
        end: "bottom bottom",
        pin: root.querySelector("[data-stage]"),
        pinSpacing: false,
        scrub: true,
      });
      gsap.from("[data-startline] > span", {
        yPercent: 105,
        stagger: 0.1,
        ease: "none",
        immediateRender: false,
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "center top",
          scrub: true,
        },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  const s = media.start ?? {};

  return (
    <section
      ref={rootRef}
      id="start"
      className="sl-start"
      aria-labelledby="sl-start-h2"
    >
      <div className="sl-start-stage" data-stage>
        <div className="sl-start-media">
          {s.poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={s.poster}
              alt=""
              aria-hidden="true"
              className="sl-video-layer sl-start-wide"
            />
          ) : null}
          {s.posterMobile ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={s.posterMobile}
              alt=""
              aria-hidden="true"
              className="sl-video-layer sl-start-portrait"
            />
          ) : null}
          {s.video ? (
            <video
              className="sl-video-layer sl-start-wide"
              muted
              playsInline
              loop
              autoPlay
              preload="none"
              aria-hidden="true"
              poster={s.poster}
            >
              <source src={s.video} type="video/mp4" />
            </video>
          ) : null}
          {s.videoMobile ? (
            <video
              className="sl-video-layer sl-start-portrait"
              muted
              playsInline
              loop
              autoPlay
              preload="none"
              aria-hidden="true"
              poster={s.posterMobile}
            >
              <source src={s.videoMobile} type="video/mp4" />
            </video>
          ) : null}
          <div className="sl-video-layer sl-scrim-left" aria-hidden="true" />
        </div>

        <div className="sl-wrap sl-start-content">
          <RoundMark label={ROUNDS.start} />
          <h2 id="sl-start-h2" className="sl-display-xl sl-start-h2">
            {START.h1.map((line) => (
              <span key={line} className="sl-line-mask" data-startline>
                <span>{line}</span>
              </span>
            ))}
          </h2>
          {START.lines.map((l) => (
            <p key={l} className="sl-lead sl-start-line">
              {l}
            </p>
          ))}
          <div className="sl-start-actions">
            <button
              type="button"
              className="sl-btn sl-btn-primary"
              onClick={() => onBook({ intent: "probetraining" })}
            >
              {START.primary}
              <span className="sl-arrow" aria-hidden="true">
                ↗
              </span>
            </button>
            <a className="sl-btn sl-btn-glass" href={`tel:${tel}`}>
              <span aria-hidden="true">✆</span>
              {START.secondary}
            </a>
          </div>
        </div>

        <KiChip className="sl-start-ki" />
      </div>
    </section>
  );
}
