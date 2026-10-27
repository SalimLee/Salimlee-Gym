"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, prefersReducedMotion } from "./gsap";

let lenisInstance: Lenis | null = null;

/** Zugriff für Anker-Sprünge und zum Pausieren (Modal/Lightbox). */
export function getLenis(): Lenis | null {
  return lenisInstance;
}

/** Scrollt per Lenis zu einem Anker; ohne Lenis nativer Fallback. */
export function scrollToAnchor(hash: string) {
  const el = document.querySelector(hash);
  if (!el) return;
  if (lenisInstance) lenisInstance.scrollTo(el as HTMLElement, { offset: 0 });
  else el.scrollIntoView({ behavior: "smooth" });
}

/**
 * Lenis (lerp 0.1, syncTouch false) über den GSAP-Ticker — eine Uhr für alles.
 * Bei reduzierter Bewegung komplett aus (B.8).
 */
export function SmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const lenis = new Lenis({ lerp: 0.1, syncTouch: false });
    lenisInstance = lenis;

    const onScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onScroll);

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.off("scroll", onScroll);
      lenis.destroy();
      lenisInstance = null;
    };
  }, []);

  return null;
}
