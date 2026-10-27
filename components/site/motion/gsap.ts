"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// GSAP 3.13+: ScrollTrigger ist frei. Nur im Client registrieren.
// registerPlugin ist idempotent.
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger };

/** Kurven aus B.4.4 */
export const EASE = {
  out: "expo.out",
  inOut: "power3.inOut",
} as const;

/** true, wenn der Nutzer reduzierte Bewegung wünscht (synchron, für GSAP-Setups). */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
