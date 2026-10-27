"use client";

import { useEffect, useState } from "react";
import { LIVE } from "@/content/site";
import { MEDIA } from "@/content/media";
import { getLiveState, type LiveState } from "./schedule";

/**
 * LIVE-Karte (B.6.1): Glas dunkel, Kopf mit Live-Punkt, Mini-Video 16:10 und
 * drei Readout-Zeilen aus dem Stundenplan (Europe/Berlin). Der Punkt pulsiert
 * nur, wenn gerade ein Kurs läuft.
 */
export function LiveCard({ onExpand }: { onExpand?: () => void }) {
  // Serverseitig neutral rendern, im Client aktualisieren (keine Hydration-Diffs).
  const [state, setState] = useState<LiveState | null>(null);

  useEffect(() => {
    const update = () => setState(getLiveState());
    update();
    const id = window.setInterval(update, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const rows = state?.rows ?? [
    { label: LIVE.next, value: "–" },
    { label: LIVE.begins, value: "–" },
    { label: LIVE.open, value: LIVE.openUntil },
  ];

  const mini = (MEDIA as Record<string, any>).technik?.live169 as
    | string
    | undefined;

  return (
    <div className="sl-live sl-glass">
      <div className="sl-live-head">
        <span className="sl-readout sl-live-title">
          <span
            className={`sl-live-dot${state?.running ? " is-running" : ""}`}
            aria-hidden="true"
          />
          {LIVE.title}
        </span>
        <button
          type="button"
          className="sl-live-expand"
          onClick={onExpand}
          aria-label="Film ansehen"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path
              d="M1 5V1h4M13 9v4H9M13 5V1H9M1 9v4h4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
            />
          </svg>
        </button>
      </div>

      <div className="sl-live-media">
        {mini ? (
          <video
            src={mini}
            muted
            playsInline
            loop
            autoPlay
            aria-hidden="true"
            preload="none"
          />
        ) : null}
      </div>

      <dl className="sl-live-rows">
        {rows.map((r) => (
          <div key={r.label} className="sl-live-row">
            <dt className="sl-readout">{r.label}</dt>
            <dd className="sl-num sl-live-value">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
