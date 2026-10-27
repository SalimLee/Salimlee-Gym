"use client";

import { useEffect, useRef, useState } from "react";

/**
 * true, sobald das Element näher als `margin` am Viewport ist (einmalig).
 * Damit laden schwere Videos erst, wenn sie gebraucht werden (B.5.5/B.9) —
 * `preload="none"` allein reicht nicht, `autoplay` lädt sonst sofort.
 */
export function useNearViewport<T extends HTMLElement>(margin = "100% 0px") {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);

  return [ref, near] as const;
}

/** Reagiert live auf eine Media Query (SSR-sicher: startet mit `false`). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

/** true, sobald die Seite fertig geladen ist — schwere Medien erst nach dem LCP (B.9). */
export function useAfterLoad(delay = 600): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let t = 0
    const go = () => {
      t = window.setTimeout(() => setReady(true), delay)
    }
    if (document.readyState === 'complete') go()
    else window.addEventListener('load', go, { once: true })
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('load', go)
    }
  }, [delay])
  return ready
}

/**
 * Darf ein schweres Hintergrund-Video laden? Nur wenn es nahe am Viewport ist,
 * die Seite fertig geladen hat und der Viewport breit genug ist. Auf schmalen
 * Viewports bleibt es beim Poster (Medienbudget mobil <= 2,5 MB, B.9).
 */
export function useHeavyVideo<T extends HTMLElement>() {
  const [ref, near] = useNearViewport<T>('60% 0px')
  const loaded = useAfterLoad()
  const narrow = useMediaQuery('(max-width: 1023px)')
  const [wide, setWide] = useState(false)
  useEffect(() => setWide(!window.matchMedia('(max-width: 1023px)').matches), [narrow])
  return [ref, near && loaded && wide] as const
}
