"use client";

import { useState } from "react";
import { PREISE, ROUNDS } from "@/content/site";
import { MEDIA } from "@/content/media";
import { RoundMark } from "../ui/RoundMark";
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
        <RoundMark label={ROUNDS.preise} />
        <h2 id="sl-preise-h2" className="sl-display-lg">
          {PREISE.h2}
        </h2>
        <p className="sl-lead sl-preise-lead">{PREISE.lead}</p>

        <div className="sl-tabs" role="tablist" aria-label="Preiskategorien">
          {PREISE.tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              id={`sl-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`sl-panel-${t.id}`}
              className={`sl-tab sl-ui${tab === t.id ? " is-active" : ""}`}
              onClick={() => setTab(t.id)}
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
                    <span
                      className={`sl-chip sl-readout ${
                        p.discount === "Beste Ersparnis"
                          ? "sl-badge-signal"
                          : "sl-badge-glass"
                      }`}
                    >
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
