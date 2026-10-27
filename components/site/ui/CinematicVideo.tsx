"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src?: string | null;
  srcAv1?: string | null;
  poster: string;
  /** Vorgerendertes unscharfes Poster für die Fokus-Überblendung (B.5.5) */
  posterBlur?: string | null;
  /** z. B. "16 / 9" */
  ratio?: string;
  className?: string;
  objectPosition?: string;
  /** Fokus-Überblendung: unscharfes Poster liegt oben und blendet aus, wenn `focused` */
  focused?: boolean;
  /** Poster sofort laden (LCP-Kandidat) */
  priority?: boolean;
};

/**
 * Video-Baustein (B.5.5): erst Poster, Video lädt erst wenn der Abschnitt näher
 * als 100 vh ist, pausiert außerhalb des Viewports und bei verstecktem Tab.
 * Bei saveData oder reduzierter Bewegung bleibt es beim Poster.
 */
export function CinematicVideo({
  src,
  srcAv1,
  poster,
  posterBlur,
  ratio = "16 / 9",
  className = "",
  objectPosition = "50% 50%",
  focused = true,
  priority = false,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mayLoad, setMayLoad] = useState(false);
  const [posterOnly, setPosterOnly] = useState(true);

  // Entscheidung: Video überhaupt laden?
  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const conn = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    const saveData = !!conn?.saveData;
    setPosterOnly(reduced || saveData || !src);
  }, [src]);

  // Nähe zum Viewport -> laden
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || posterOnly) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMayLoad(true);
          io.disconnect();
        }
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [posterOnly]);

  // Sichtbarkeit -> abspielen / pausieren
  useEffect(() => {
    const el = wrapRef.current;
    const v = videoRef.current;
    if (!el || !v || posterOnly || !mayLoad) return;

    let inView = false;
    const sync = () => {
      if (inView && !document.hidden) void v.play().catch(() => {});
      else v.pause();
    };
    const io = new IntersectionObserver(
      (entries) => {
        inView = entries.some((e) => e.isIntersecting);
        sync();
      },
      { threshold: 0.01 },
    );
    io.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [mayLoad, posterOnly]);

  return (
    <div
      ref={wrapRef}
      className={`sl-video ${className}`}
      style={{ aspectRatio: ratio }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={poster}
        alt=""
        aria-hidden="true"
        className="sl-video-layer"
        style={{ objectPosition }}
        loading={priority ? "eager" : "lazy"}
        // @ts-expect-error fetchpriority ist (noch) nicht typisiert
        fetchpriority={priority ? "high" : undefined}
        decoding="async"
      />

      {!posterOnly && mayLoad && src ? (
        <video
          ref={videoRef}
          className="sl-video-layer"
          style={{ objectPosition }}
          muted
          playsInline
          loop
          preload="metadata"
          aria-hidden="true"
          poster={poster}
        >
          {srcAv1 ? (
            <source src={srcAv1} type="video/mp4; codecs=av01.0.05M.08" />
          ) : null}
          <source src={src} type="video/mp4" />
        </video>
      ) : null}

      {/* Fokus-Überblendung: unscharfes Poster blendet aus (günstiger als filter:blur) */}
      {posterBlur ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={posterBlur}
          alt=""
          aria-hidden="true"
          className="sl-video-layer sl-video-blur"
          style={{ objectPosition, opacity: focused ? 0 : 1 }}
          loading="lazy"
          decoding="async"
        />
      ) : null}
    </div>
  );
}
