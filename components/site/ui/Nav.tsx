"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { NAV } from "@/content/site";
import { MEDIA } from "@/content/media";
import { scrollToAnchor } from "../motion/SmoothScroll";

/**
 * Navigation (B.5.1): 72 px, transparent über dem Hero, ab 80 vh Glasleiste.
 * Die Rundenuhr läuft als ruhiger Mono-Readout mit dem Scrollfortschritt —
 * gleiche Lesart wie „Läuft gerade", Standort und Öffnungszeiten (Freigabe 27.10.2026).
 */
export function Nav({ onBook }: { onBook: () => void }) {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const ticking = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        setSolid(window.scrollY > window.innerHeight * 0.8);
        ticking.current = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Menü schließen bei Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const go = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setOpen(false);
    scrollToAnchor(href);
  };

  const logo = (MEDIA as Record<string, any>).brand?.logo280 as
    | string
    | undefined;

  return (
    <header className={`sl-nav${solid ? " is-solid" : ""}`}>
      <div className="sl-nav-inner">
        <Link
          href="/"
          className="sl-nav-logo"
          aria-label="Salim Lee — Startseite"
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="Salim Lee" width={280} height={58} />
          ) : (
            <span className="sl-ui">SALIM LEE</span>
          )}
        </Link>

        <nav className="sl-nav-links" aria-label="Hauptnavigation">
          {NAV.links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="sl-ui"
              onClick={(e) => go(e, l.href)}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="sl-nav-right">
          <button
            type="button"
            className="sl-btn sl-btn-primary sl-nav-cta"
            onClick={onBook}
          >
            {NAV.cta}
          </button>

          <button
            type="button"
            className="sl-nav-burger sl-ui"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="sl-mobile-menu"
          >
            {open ? "Schließen" : NAV.menu}
          </button>
        </div>
      </div>

      {open ? (
        <div id="sl-mobile-menu" className="sl-nav-mobile">
          {NAV.links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="sl-display-lg sl-nav-mobile-link"
              onClick={(e) => go(e, l.href)}
            >
              {l.label}
            </a>
          ))}
          <button
            type="button"
            className="sl-btn sl-btn-primary"
            onClick={() => {
              setOpen(false);
              onBook();
            }}
          >
            {NAV.cta}
          </button>
        </div>
      ) : null}
    </header>
  );
}
