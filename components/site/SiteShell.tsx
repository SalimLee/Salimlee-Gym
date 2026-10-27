"use client";

import { useCallback, useState } from "react";
import { KURSE, PREISE } from "@/content/site";

/** Vorauswahl, die von außen ins Buchungsformular gereicht wird (B.1). */
export type BookingPreset = {
  intent?: "probetraining" | "mitgliedschaft";
  course?: string;
  membership?: string;
  message?: string;
};

/**
 * Orchestriert die öffentliche Seite: Runden 01–08, Kontakt, Footer und den
 * Buchungs-Dialog. Die Abschnitte werden in den Schritten aus B.13 gefüllt.
 */
export function SiteShell() {
  const [booking, setBooking] = useState<BookingPreset | null>(null);

  const openBooking = useCallback((preset: BookingPreset = {}) => {
    setBooking(preset);
  }, []);

  // Platzhalter bis Schritt 3–7 – IDs stehen bereits (alte Anker bleiben gültig).
  return (
    <>
      <main id="inhalt">
        <section id="hero" className="sl-section sl-wrap" data-round="01">
          <p className="sl-readout">Runde 01 — Fokus</p>
          <h1 className="sl-display-xl">Dein Ring.</h1>
        </section>

        <section id="haltung" className="sl-section sl-wrap" data-round="02" />
        <section id="angebote" className="sl-section sl-wrap" data-round="03">
          <h2 className="sl-display-lg">{KURSE.h2}</h2>
        </section>
        <section id="technik" className="sl-section sl-wrap" data-round="04" />
        <section id="about" className="sl-section sl-wrap" data-round="05" />
        <section id="gym" className="sl-section sl-wrap" data-round="06" />
        <section id="preise" className="sl-section sl-wrap" data-round="07">
          <h2 className="sl-display-lg">{PREISE.h2}</h2>
        </section>
        <section id="start" className="sl-section sl-wrap" data-round="08" />
        <section id="kontakt" className="sl-section sl-wrap" />
      </main>

      {booking ? (
        <div hidden aria-hidden="true" onClick={() => openBooking()} />
      ) : null}
    </>
  );
}
