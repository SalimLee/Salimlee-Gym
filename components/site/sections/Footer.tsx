"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { FOOTER } from "@/content/site";
import { MEDIA } from "@/content/media";
import { SITE_CONFIG } from "@/lib/constants";
import { prefersReducedMotion } from "../motion/gsap";

const media = MEDIA as Record<string, any>;

/**
 * Footer (B.6.9): großes Laufband als Kontur – Richtung folgt der
 * Scrollrichtung, Tempo der Scrollgeschwindigkeit. Darunter Logo, Motto,
 * Social, Rechtliches und die KI-Zeile.
 */
export function Footer() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || prefersReducedMotion()) return;

    let offset = 0;
    let lastY = window.scrollY;
    let velocity = 0;
    let raf = 0;

    const onScroll = () => {
      const y = window.scrollY;
      velocity = y - lastY;
      lastY = y;
    };

    const loop = () => {
      // Grundtempo + Scroll-Einfluss; Richtung folgt der Scrollrichtung
      const speed = 0.4 + Math.min(4, Math.abs(velocity) * 0.12);
      offset -= (velocity >= 0 ? 1 : -1) * speed;
      const w = track.scrollWidth / 2 || 1;
      if (offset <= -w) offset += w;
      if (offset > 0) offset -= w;
      track.style.transform = `translate3d(${offset}px,0,0)`;
      velocity *= 0.9;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const logo = media.brand?.logo280 as string | undefined;
  const year = new Date().getFullYear();

  return (
    <footer className="sl-footer">
      <div className="sl-marquee" aria-hidden="true">
        <div className="sl-marquee-track" ref={trackRef}>
          <span className="sl-display-words sl-marquee-text">
            {FOOTER.marquee}
          </span>
          <span className="sl-display-words sl-marquee-text">
            {FOOTER.marquee}
          </span>
        </div>
      </div>

      <div className="sl-wrap sl-footer-inner">
        <div className="sl-footer-brand">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt="Salim Lee"
              className="sl-footer-logo"
              width={160}
              height={36}
            />
          ) : null}
          <p className="sl-readout sl-footer-motto">
            {FOOTER.motto.join(" · ")}
          </p>
        </div>

        <ul className="sl-footer-socials">
          {FOOTER.socials.map((s) => (
            <li key={s.label}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="sl-readout"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>

        <ul className="sl-footer-legal">
          {FOOTER.legal.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="sl-readout">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <p className="sl-readout sl-footer-copy">
          © {year} {SITE_CONFIG.name}. Alle Rechte vorbehalten.
        </p>

        {/* KI-Kennzeichnung (AI Act Art. 50 Abs. 4) */}
        <p className="sl-readout sl-footer-ai">{FOOTER.aiNote}</p>
      </div>
    </footer>
  );
}
