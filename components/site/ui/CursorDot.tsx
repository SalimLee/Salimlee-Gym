"use client";

import { useEffect, useRef } from "react";

const INTERACTIVE =
  'a,button,input,textarea,select,summary,[role="button"],[role="tab"]';

/**
 * Cursor-Punkt (B.5.2): 12 px, folgt mit lerp 0.18, mix-blend-mode difference.
 * Der normale Mauszeiger bleibt. Nur bei pointer:fine, aus bei reduzierter Bewegung,
 * blendet über Buttons und Links aus.
 */
export function CursorDot() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let x = 0;
    let y = 0;
    let tx = 0;
    let ty = 0;
    let seen = false;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!seen) {
        seen = true;
        x = tx;
        y = ty;
      }
      const target = e.target as HTMLElement | null;
      const over = !!target?.closest?.(INTERACTIVE);
      el.style.opacity = over ? "0" : "1";
    };

    const loop = () => {
      x += (tx - x) * 0.18;
      y += (ty - y) * 0.18;
      el.style.transform = `translate3d(${x - 6}px, ${y - 6}px, 0)`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} className="sl-cursor-dot" aria-hidden="true" />;
}
