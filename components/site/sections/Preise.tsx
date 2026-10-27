"use client";

import { useState } from "react";
import { PREISE } from "@/content/site";
import { MEDIA } from "@/content/media";
import type { BookingPreset } from "../SiteShell";

const media = MEDIA as Record<string, any>;

/** Kurs-Zuordnung für die Vorauswahl im Formular. */
function courseFor(tab: string, name: string): string {
  if (tab === "personal") return "Personaltraining";
  if (/kinder/i.test(name)) return "Kinderkurse";
  return "Erwachsenenkurse";
}

/**
 * Runde 07 — Preise (B.6.7): Tabs, Glas-Zeilen mit Hairlines.
 * „Beste Ersparnis" ist die einzige orange Badge; alles andere Glas.
 */
export function Preise({ onBook }: { onBook: (p: BookingPreset) => void }) {
  const [tab, setTab] = useState<string>(PREISE.tabs[0].id);

  /** Pfeile, Home und Ende wechseln den Tab und nehmen den Fokus mit (WAI-ARIA). */
  const onTabKey = (e: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    const last = PREISE.tabs.length - 1;
    const next =
      e.key === "ArrowRight"
        ? i === last
          ? 0
          : i + 1
        : e.key === "ArrowLeft"
          ? i === 0
            ? last
            : i - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : -1;
    if (next < 0) return;
    e.preventDefault();
    const id = PREISE.tabs[next].id;
    setTab(id);
    document.getElementById(`sl-tab-${id}`)?.focus();
  };

  const rows = PREISE.items.filter((p) => p.category === tab);
  const serviceItem = PREISE.items.find((p) => p.category === "service");
  const bg = media.details?.preise as string | undefined;

  return (
    <section
      id="preise"
      className="sl-section sl-preise"
      aria-labelledby="sl-preise-h2"
    >
      {bg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bg}
          alt=""
          aria-hidden="true"
          className="sl-preise-bg"
          loading="lazy"
        />
      ) : null}

      <div className="sl-wrap">
        <h2 id="sl-preise-h2" className="sl-display-lg">
          {PREISE.h2}
        </h2>
        <p className="sl-lead sl-preise-lead">{PREISE.lead}</p>

        <div className="sl-tabs" role="tablist" aria-label="Preiskategorien">
          {PREISE.tabs.map((t, i) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              id={`sl-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`sl-panel-${t.id}`}
              // Roving Tabindex: Tab springt in die Leiste, Pfeile wechseln.
              tabIndex={tab === t.id ? 0 : -1}
              className={`sl-tab sl-ui${tab === t.id ? " is-active" : ""}`}
              onClick={() => setTab(t.id)}
              onKeyDown={(e) => onTabKey(e, i)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`sl-panel-${tab}`}
          aria-labelledby={`sl-tab-${tab}`}
          className="sl-price-card sl-glass"
        >
          {rows.map((p) => (
            <div key={p.id} className="sl-price-row">
              <div className="sl-price-main">
                <span className="sl-price-name">{p.name}</span>
                <span className="sl-price-meta">
                  {p.discount ? (
                    // Alle Rabatt-Hinweise ruhig in Glas — keine Signalfarbe.
                    <span className="sl-chip sl-readout sl-badge-glass">
                      {p.discount}
                    </span>
                  ) : null}
                  {p.hasServiceFee ? (
                    <span className="sl-readout sl-price-fee">
                      {PREISE.serviceNote}
                    </span>
                  ) : null}
                </span>
              </div>

              <div className="sl-price-right">
                <span className="sl-num sl-price-value">{p.price}</span>
                {p.perUnit ? (
                  <span className="sl-chip sl-badge-glass sl-readout">
                    {p.perUnit}
                  </span>
                ) : null}
              </div>

              <button
                type="button"
                className="sl-btn sl-btn-glass sl-price-cta"
                onClick={() =>
                  onBook({
                    intent: "mitgliedschaft",
                    course: courseFor(tab, p.name),
                    message: p.name,
                  })
                }
              >
                {PREISE.cta}
              </button>
            </div>
          ))}
        </div>

        {serviceItem ? (
          <p className="sl-readout sl-preise-service">
            {serviceItem.name}: {serviceItem.price} ({serviceItem.discount})
          </p>
        ) : null}
        <p className="sl-readout sl-preise-footnote">{PREISE.footnote}</p>
      </div>
    </section>
  );
}
