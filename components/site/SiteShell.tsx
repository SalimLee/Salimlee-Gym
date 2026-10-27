"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { Nav } from "./ui/Nav";
import { Hero } from "./hero/Hero";
import { Haltung } from "./sections/Haltung";
import { Kurse } from "./sections/Kurse";
import { Technik } from "./sections/Technik";
import { Coach } from "./sections/Coach";
import { Gym } from "./sections/Gym";
import { Preise } from "./sections/Preise";
import { Start } from "./sections/Start";
import { Kontakt } from "./sections/Kontakt";
import { Footer } from "./sections/Footer";
import { ReelLightbox } from "./ui/ReelLightbox";

/**
 * Das Formular kommt erst auf Klick — so bleiben zod und react-hook-form
 * aus dem ersten Ladepaket (B.9: < 180 kB ohne OGL).
 */
const BookingDialog = dynamic(
  () => import("./booking/BookingDialog").then((m) => m.BookingDialog),
  { ssr: false },
);

/** Vorauswahl, die von außen ins Buchungsformular gereicht wird (B.1). */
export type BookingPreset = {
  intent?: "probetraining" | "mitgliedschaft";
  course?: string;
  membership?: string;
  message?: string;
};

/** Orchestriert die öffentliche Seite: Runden 01–08, Kontakt, Footer, Dialoge. */
export function SiteShell() {
  const [booking, setBooking] = useState<BookingPreset | null>(null);
  const [reel, setReel] = useState(false);

  const openBooking = useCallback(
    (preset: BookingPreset = {}) => setBooking(preset),
    [],
  );
  const closeBooking = useCallback(() => setBooking(null), []);
  const openReel = useCallback(() => setReel(true), []);
  const closeReel = useCallback(() => setReel(false), []);

  return (
    <>
      <Nav onBook={() => openBooking()} />

      <main id="inhalt">
        <Hero onBook={() => openBooking()} onReel={openReel} />
        <Haltung />
        <Kurse onBook={openBooking} />
        <Technik />
        <Coach />
        <Gym />
        <Preise onBook={openBooking} />
        <Start onBook={openBooking} />
        <Kontakt />
      </main>

      <Footer />

      {booking ? (
        <BookingDialog preset={booking} onClose={closeBooking} />
      ) : null}
      <ReelLightbox open={reel} onClose={closeReel} />
    </>
  );
}
