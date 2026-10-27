"use client";

import { useEffect, useRef, useState } from "react";
import { HERO } from "@/content/site";
import { MEDIA } from "@/content/media";
import { gsap, prefersReducedMotion } from "../motion/gsap";
import { KiChip } from "../ui/KiChip";
import { LiveCard } from "./LiveCard";

type Props = { onBook: () => void; onReel: () => void };

const media = MEDIA as Record<string, any>;

/**
 * Runde 01 — Hero „Fokus", Variante „Weit" (B.6.1, Wahl 27.10.2026).
 * Vollbild-Footage, Headline unten links, LIVE-Karte unten rechts.
 */
export function Hero({ onBook, onReel }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [glReady, setGlReady] = useState(false);
  const [touch, setTouch] = useState(false);
  const [wideReady, setWideReady] = useState(false);
  useEffect(() => {
    setWideReady(!window.matchMedia("(max-width: 1023px)").matches);
  }, []);

  const hero = media.hero ?? {};
  const heroMobile = media.heroMobile ?? {};
  const poster: string | undefined = hero.poster?.w1920 ?? hero.poster?.w2560;
  const posterMobile: string | undefined = heroMobile.poster?.w1080;

  useEffect(() => {
    setTouch(!window.matchMedia("(pointer: fine)").matches);
  }, []);

  /* ---------- Intro + Herausscrollen (B.6.1) ---------- */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (prefersReducedMotion()) {
      gsap.set(root.querySelectorAll("[data-anim]"), {
        opacity: 1,
        y: 0,
        clearProps: "transform",
      });
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

      tl.from(
        '[data-anim="rule"]',
          { scaleX: 0, duration: 0.6, stagger: 0.08 },
          0.3,
        )
        // Eyebrow, Lead, Buttons und Fakten steigen per CSS auf (sl-rise):
        // der Lead ist das LCP-Element und darf nicht auf das JS warten.
        .from(
          '[data-anim="live"]',
          { opacity: 0, x: 24, filter: "blur(8px)", duration: 0.9 },
          0.9,
        );

      // Hairline unter den Zeilen wieder ausblenden
      gsap.to('[data-anim="rule"]', { opacity: 0, duration: 0.6, delay: 1.6 });

      // Herausscrollen: H1 wandert, Video schrumpft in den Rahmen
      gsap.to('[data-anim="headline"]', {
        yPercent: -25,
        opacity: 0,
        ease: "none",
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
      gsap.to('[data-anim="media"]', {
        clipPath: "inset(2vw round 6px)",
        filter: "brightness(0.55)",
        ease: "none",
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
      gsap.to('[data-anim="live"]', {
        opacity: 0,
        ease: "none",
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

  /* ---------- FocusField (nur Desktop mit Maus, eigener Chunk) ---------- */
  useEffect(() => {
    if (touch || prefersReducedMotion()) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    let instance: { destroy: () => void } | null = null;
    let cancelled = false;

    const start = async () => {
      try {
        const test = document.createElement("canvas");
        if (!test.getContext("webgl") && !test.getContext("experimental-webgl"))
          return;
        const { FocusField } = await import("./FocusField");
        if (cancelled) return;
        instance = new FocusField({
          canvas,
          video,
          rest: (hero.uRest as [number, number]) ?? [0.6, 0.37],
          onReady: () => setGlReady(true),
        });
      } catch {
        /* ohne WebGL bleibt es beim Video darunter */
      }
    };

    // Erst starten, wenn das Video Bilder liefert
    if (video.readyState >= 2) void start();
    else video.addEventListener("loadeddata", start, { once: true });

    return () => {
      cancelled = true;
      video.removeEventListener("loadeddata", start);
      instance?.destroy();
    };
  }, [touch, hero.uRest]);

  const eyebrow = touch ? HERO.eyebrowTouch : HERO.eyebrowDesktop;

  return (
    <section
      ref={rootRef}
      id="hero"
      className="sl-hero"
      aria-labelledby="sl-hero-h1"
    >
      {/* Medien */}
      <div className="sl-hero-media" data-anim="media">
        <picture>
          {heroMobile.poster ? (
            <source
              media="(max-width: 1023px)"
              srcSet={`${heroMobile.poster.w750} 750w, ${heroMobile.poster.w1080} 1080w`}
              sizes="100vw"
            />
          ) : null}
          {hero.poster ? (
            <source
              media="(min-width: 1024px)"
              srcSet={`${hero.poster.w1280} 1280w, ${hero.poster.w1920} 1920w, ${hero.poster.w2560} 2560w`}
              sizes="100vw"
            />
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={poster ?? posterMobile}
            alt={HERO.alt}
            className="sl-video-layer"
            // @ts-expect-error fetchpriority ist (noch) nicht typisiert
            fetchpriority="high"
            decoding="async"
          />
        </picture>

        {hero.video && wideReady ? (
          <video
            ref={videoRef}
            className="sl-video-layer sl-hero-video"
            muted
            playsInline
            loop
            autoPlay
            preload="metadata"
            aria-hidden="true"
            poster={poster}
            style={{ opacity: glReady ? 0 : 1 }}
          >
            {hero.videoAv1 ? (
              <source
                src={hero.videoAv1}
                type="video/mp4; codecs=av01.0.05M.08"
              />
            ) : null}
            <source src={hero.video} type="video/mp4" />
          </video>
        ) : null}

        <canvas
          ref={canvasRef}
          className="sl-video-layer sl-hero-canvas"
          aria-hidden="true"
          style={{ opacity: glReady ? 1 : 0 }}
        />

        <div className="sl-video-layer sl-scrim-left" aria-hidden="true" />
        <div className="sl-hero-scrim-top sl-scrim-top" aria-hidden="true" />
      </div>

      {/* Inhalt */}
      <div className="sl-hero-content sl-wrap">
        <div className="sl-hero-text" data-anim="headline">
          <p className="sl-readout sl-hero-eyebrow" data-anim="eyebrow">
            {eyebrow}
          </p>

          <h1 id="sl-hero-h1" className="sl-display-xl sl-hero-h1">
            {HERO.h1.map((line) => (
              <span key={line} className="sl-line-wrap">
                <span className="sl-line-mask" data-anim="line">
                  <span>{line}</span>
                </span>
                <span
                  className="sl-line-rule"
                  data-anim="rule"
                  aria-hidden="true"
                />
              </span>
            ))}
          </h1>

          <p className="sl-lead sl-hero-lead" data-anim="fade">
            {HERO.lead}
          </p>

          <div className="sl-hero-actions" data-anim="fade">
            <button
              type="button"
              className="sl-btn sl-btn-primary"
              onClick={onBook}
            >
              {HERO.primary}
              <span className="sl-arrow" aria-hidden="true">
                ↗
              </span>
            </button>
            <button
              type="button"
              className="sl-btn sl-btn-glass"
              onClick={onReel}
            >
              <span aria-hidden="true">⊙</span>
              {HERO.secondary}
            </button>
          </div>

          <ul className="sl-hero-facts sl-hairline" data-anim="fade">
            {HERO.facts.map((f) => (
              <li key={f.text} className="sl-readout">
                <span aria-hidden="true">{f.icon === "pin" ? "⊕" : "★"}</span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="sl-hero-live" data-anim="live">
          <LiveCard onExpand={onReel} />
        </div>
      </div>

      <KiChip className="sl-hero-ki" />
    </section>
  );
}
