"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MEDIA } from "@/content/media";
import { getLenis } from "../motion/SmoothScroll";

const media = MEDIA as Record<string, any>;

/**
 * Reel-Lightbox (B.6.11): Hochkant-Player im Story-Stil, weil das Material 9:16
 * ist. Oben ein Fortschrittsbalken je Clip, links/rechts bzw. Pfeiltasten für
 * zurück/weiter, ESC schließt. Alle Clips stumm.
 *
 * V01m (Veo, mobiler Hero) fehlt — der Clip entfällt, deshalb trägt hier kein
 * Medium den KI-Chip: V04, V07 und die raw-Ausschnitte sind echte Aufnahmen.
 */
function buildClips(): { src: string; label: string }[] {
  const c: { src: string; label: string }[] = [];
  if (media.heroMobile?.video)
    c.push({ src: media.heroMobile.video, label: "Hero" });
  if (media.technik?.video)
    c.push({ src: media.technik.video, label: "Kombinationen" });
  if (media.kurse?.personal)
    c.push({ src: media.kurse.personal, label: "Speedball" });
  if (media.reel?.boxjump)
    c.push({ src: media.reel.boxjump, label: "Box-Jump" });
  if (media.reel?.seilspringen)
    c.push({ src: media.reel.seilspringen, label: "Seilspringen" });
  if (media.reel?.weggehen)
    c.push({ src: media.reel.weggehen, label: "Nebel" });
  return c;
}

export function ReelLightbox({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [clips] = useState(buildClips);
  const [i, setI] = useState(0);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const next = useCallback(() => {
    setI((v) => {
      if (v + 1 >= clips.length) {
        onClose();
        return v;
      }
      return v + 1;
    });
    setProgress(0);
  }, [clips.length, onClose]);

  const prev = useCallback(() => {
    setI((v) => Math.max(0, v - 1));
    setProgress(0);
  }, []);

  useEffect(() => {
    if (!open) return;
    setI(0);
    setProgress(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const lenis = getLenis();
    lenis?.stop();
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      lenis?.start();
    };
  }, [open, onClose, next, prev]);

  if (!open || !clips.length) return null;
  const clip = clips[i];

  return (
    <div
      className="sl-reel"
      role="dialog"
      aria-modal="true"
      aria-label="Film ansehen"
    >
      <div className="sl-reel-bars" aria-hidden="true">
        {clips.map((c, idx) => (
          <span key={c.src} className="sl-reel-bar">
            <span
              className="sl-reel-bar-fill"
              style={{
                width:
                  idx < i ? "100%" : idx === i ? `${progress * 100}%` : "0%",
              }}
            />
          </span>
        ))}
      </div>

      <button
        type="button"
        className="sl-reel-close"
        onClick={onClose}
        aria-label="Schließen"
      >
        ✕
      </button>

      <div className="sl-reel-stage">
        <video
          key={clip.src}
          ref={videoRef}
          className="sl-reel-video"
          src={clip.src}
          muted
          playsInline
          autoPlay
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (v.duration) setProgress(v.currentTime / v.duration);
          }}
          onEnded={next}
          aria-label={clip.label}
        />
        <button
          type="button"
          className="sl-reel-hit sl-reel-prev"
          onClick={prev}
          aria-label="Zurück"
        />
        <button
          type="button"
          className="sl-reel-hit sl-reel-next"
          onClick={next}
          aria-label="Weiter"
        />
      </div>
    </div>
  );
}
