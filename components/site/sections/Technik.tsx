"use client";

import { useEffect, useRef, useState } from "react";
import { TECHNIK } from "@/content/site";
import { MEDIA } from "@/content/media";
import { gsap, ScrollTrigger, prefersReducedMotion } from "../motion/gsap";
import { useHeavyVideo } from "../motion/useInView";

const media = MEDIA as Record<string, any>;

/**
 * Runde 04 — Technik (B.6.4), fixiert über 220 vh.
 * Das Video ist ein kurzer Loop, die Schlagnamen leuchten deshalb im Takt
 * (alle 0,8 s der nächste), nicht synchron zum Original. Der Timer pausiert,
 * wenn der Abschnitt nicht sichtbar ist. Die vier Säulen kommen am Scroll.
 */
export function Technik() {
  const rootRef = useRef<HTMLElement>(null);
  const [beat, setBeat] = useState(0);
  const [frameRef, near] = useHeavyVideo<HTMLDivElement>();

  // Takt der Schlagnamen – nur solange sichtbar
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (prefersReducedMotion()) return;

    let timer = 0;
    const start = () => {
      if (timer) return;
      timer = window.setInterval(
        () => setBeat((b) => (b + 1) % TECHNIK.punches.length),
        800,
      );
    };
    const stop = () => {
      window.clearInterval(timer);
      timer = 0;
    };
    const io = new IntersectionObserver(
      (entries) =>
        entries.some((e) => e.isIntersecting) && !document.hidden
          ? start()
          : stop(),
      { threshold: 0.2 },
    );
    io.observe(root);
    document.addEventListener("visibilitychange", () =>
      document.hidden ? stop() : undefined,
    );
    return () => {
      stop();
      io.disconnect();
    };
  }, []);

  // Säulen am Scroll
  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: root,
        start: "top top",
        end: "bottom bottom",
        pin: root.querySelector("[data-stage]"),
        pinSpacing: false,
        scrub: true,
      });
      gsap.from("[data-pillar]", {
        y: 20,
        opacity: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: "expo.out",
        immediateRender: false,
        scrollTrigger: {
          trigger: root,
          start: "top -40%",
          end: "bottom bottom",
          scrub: true,
        },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  const t = media.technik ?? {};

  return (
    <section
      ref={rootRef}
      id="technik"
      className="sl-technik"
      aria-labelledby="sl-technik-h2"
    >
      <div className="sl-technik-stage" data-stage>
        <div className="sl-wrap sl-technik-grid">
          <div className="sl-technik-frame sl-glass" ref={frameRef}>
            {t.poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={t.poster}
                alt=""
                aria-hidden="true"
                className="sl-video-layer"
              loading="lazy"
              decoding="async"
              />
            ) : null}
            {t.video && near ? (
              <video
                className="sl-video-layer"
                muted
                playsInline
                loop
                autoPlay
                preload="none"
                aria-hidden="true"
                poster={t.poster}
              >
                <source src={t.video} type="video/mp4" />
              </video>
            ) : null}
          </div>

          <div className="sl-technik-text">
            <h2 id="sl-technik-h2" className="sl-display-lg">
              {TECHNIK.h2}
            </h2>
            <p className="sl-lead sl-technik-lead">{TECHNIK.lead}</p>

            <ul className="sl-punches" aria-label="Schlagtechniken">
              {TECHNIK.punches.map((p, i) => (
                <li
                  key={p}
                  className={`sl-display-lg sl-punch${i === beat ? " is-active" : ""}`}
                >
                  {p}
                </li>
              ))}
            </ul>

            <ul className="sl-pillars sl-hairline">
              {TECHNIK.pillars.map((p) => (
                <li key={p} className="sl-readout" data-pillar>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
