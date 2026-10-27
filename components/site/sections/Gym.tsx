"use client";

import { useEffect, useRef } from "react";
import { GYM, ROUNDS } from "@/content/site";
import { MEDIA } from "@/content/media";
import { gsap, prefersReducedMotion } from "../motion/gsap";
import { RoundMark } from "../ui/RoundMark";
import { KiChip } from "../ui/KiChip";

const media = MEDIA as Record<string, any>;

/** Regelmäßiges Sechseck als SVG-Pfad um (cx,cy) in Prozent. */
function hexPath(cx: number, cy: number, r: number, aspect: number) {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push(
      `${(cx + r * Math.cos(a)).toFixed(3)},${(cy + r * aspect * Math.sin(a)).toFixed(3)}`,
    );
  }
  return `M${pts.join("L")}Z`;
}

/**
 * Runde 06 — Das Gym (B.6.6): Bild mit Parallaxe, darüber zeichnen sich drei
 * Hexagon-Umrisse nach, deckungsgleich mit den Deckenleuchten (Positionen in
 * Phase 4 aus B06 gemessen). Mobil: Original-Boxring 4:5, Hexagone aus.
 */
export function Gym() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-parallax]",
        { yPercent: -8 },
        {
          yPercent: 8,
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        },
      );
      gsap.to("[data-hex]", {
        strokeDashoffset: 0,
        duration: 1.6,
        stagger: 0.18,
        ease: "expo.out",
        scrollTrigger: { trigger: root, start: "top 70%", once: true },
        onComplete: () =>
          gsap.to("[data-hex]", { opacity: 0.1, duration: 1.2 }),
      });
    }, root);
    return () => ctx.revert();
  }, []);

  const g = media.gym ?? {};
  const hexes: [number, number][] = g.hexagons ?? [
    [0.46, 0.25],
    [0.54, 0.25],
    [0.5, 0.31],
  ];

  return (
    <section
      ref={rootRef}
      id="gym"
      className="sl-gym"
      aria-labelledby="sl-gym-h2"
    >
      <div className="sl-gym-media">
        <div className="sl-gym-parallax" data-parallax>
          {g.w16x9 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={g.w16x9}
              alt="Der Boxring im Salim Lee Gym mit den Hexagon-Deckenleuchten"
              className="sl-video-layer sl-gym-wide"
              loading="lazy"
              decoding="async"
            />
          ) : null}
          {g.w4x5 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={g.w4x5}
              alt="Der Boxring im Salim Lee Gym"
              className="sl-video-layer sl-gym-portrait"
              loading="lazy"
              decoding="async"
            />
          ) : null}
        </div>

        <svg
          className="sl-gym-hexes"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {hexes.map(([x, y], i) => (
            <path
              key={i}
              data-hex
              d={hexPath(x * 100, y * 100, 4.2, 1.6)}
              fill="none"
              stroke="rgba(255,255,255,0.24)"
              strokeWidth="0.12"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1}
            />
          ))}
        </svg>

        <div className="sl-video-layer sl-scrim-left" aria-hidden="true" />
      </div>

      <div className="sl-wrap sl-gym-content">
        <RoundMark label={ROUNDS.gym} />
        <h2 id="sl-gym-h2" className="sl-display-lg">
          {GYM.h2}
        </h2>
        <ul className="sl-gym-facts sl-hairline">
          {GYM.facts.filter(Boolean).map((f) => (
            <li key={f} className="sl-readout">
              {f}
            </li>
          ))}
        </ul>
      </div>

      <KiChip className="sl-gym-ki" />
    </section>
  );
}
