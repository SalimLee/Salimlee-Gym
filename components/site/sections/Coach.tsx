"use client";

import { useEffect, useRef, useState } from "react";
import { COACH, ROUNDS } from "@/content/site";
import { MEDIA } from "@/content/media";
import { gsap, prefersReducedMotion } from "../motion/gsap";
import { RoundMark } from "../ui/RoundMark";
import { KiChip } from "../ui/KiChip";

const media = MEDIA as Record<string, any>;

/** '5+' -> {num: 5, suffix: '+'} */
function splitStat(v: string) {
  const m = v.match(/^(\d+)(.*)$/);
  return m ? { num: parseInt(m[1], 10), suffix: m[2] } : { num: 0, suffix: v };
}

/**
 * Runde 05 — Coach (B.6.5): 21:9 vollflächig, Fokus zieht beim Eintritt scharf,
 * Glaskarte mit den drei Absätzen, darunter die Zahlenreihe (zählt einmal hoch).
 */
export function Coach() {
  const rootRef = useRef<HTMLElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (prefersReducedMotion()) {
      setFocused(true);
      root.querySelectorAll<HTMLElement>("[data-stat-num]").forEach((el) => {
        el.textContent = el.dataset.statNum ?? "";
      });
      return;
    }

    // Fokus-Ueberblendung per IntersectionObserver - feuert auch dann,
    // wenn ScrollTrigger (z.B. bei Ganzseiten-Captures) nicht ausloest.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setFocused(true);
          io.disconnect();
        }
      },
      { threshold: 0.05 },
    );
    io.observe(root);

    const ctx = gsap.context(() => {
      
      // Zahlen einmal hochzählen
      root.querySelectorAll<HTMLElement>("[data-stat-num]").forEach((el) => {
        const target = parseInt(el.dataset.statNum ?? "0", 10);
        const obj = { v: 0 };
        gsap.fromTo(obj, { v: 0 }, {
          v: target,
          immediateRender: false,
          duration: 1.4,
          ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
          onUpdate: () => {
            el.textContent = String(Math.round(obj.v));
          },
        });
      });
    }, root);

    return () => {
      io.disconnect();
      ctx.revert();
    };
  }, []);

  const c = media.coach ?? {};

  return (
    <section
      ref={rootRef}
      id="about"
      className="sl-coach"
      aria-labelledby="sl-coach-h2"
    >
      <div className="sl-coach-media">
        {c.w21x9 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.w21x9}
            alt="Coach Salim Lee im Porträt"
            className="sl-video-layer sl-coach-wide"
            loading="lazy"
            decoding="async"
          />
        ) : null}
        {c.w4x5 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.w4x5}
            alt="Coach Salim Lee im Porträt"
            className="sl-video-layer sl-coach-portrait"
            loading="lazy"
            decoding="async"
          />
        ) : null}
        <div
          className="sl-video-layer sl-coach-blur"
          style={{ opacity: focused ? 0 : 1 }}
          aria-hidden="true"
        />
        <div className="sl-video-layer sl-scrim-left" aria-hidden="true" />
      </div>

      <div className="sl-wrap sl-coach-content">
        <div className="sl-coach-card sl-glass">
          <RoundMark label={ROUNDS.coach} />
          <p className="sl-readout sl-coach-eyebrow">{COACH.eyebrow}</p>
          <h2 id="sl-coach-h2" className="sl-display-lg">
            {COACH.h2}
          </h2>
          {COACH.paragraphs.map((p, i) => (
            <p key={i} className={i === 0 ? "sl-lead" : "sl-coach-p"}>
              {p}
            </p>
          ))}
          <p className="sl-coach-closing">{COACH.closing}</p>
        </div>

        <dl className="sl-stats">
          {COACH.stats.map((s) => {
            const { num, suffix } = splitStat(s.number);
            return (
              <div key={s.label} className="sl-stat sl-hairline">
                <dt className="sl-num sl-stat-value">
                  <span data-stat-num={String(num)}>{num}</span>
                  {suffix}
                </dt>
                <dd className="sl-readout sl-stat-label">{s.label}</dd>
              </div>
            );
          })}
        </dl>
      </div>

      <KiChip className="sl-coach-ki" />
    </section>
  );
}
