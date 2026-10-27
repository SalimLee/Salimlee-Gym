"use client";

import { useCallback, useState } from "react";
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
import { BookingDialog } from "./booking/BookingDialog";
import { ReelLightbox } from "./ui/ReelLightbox";

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

      <BookingDialog preset={booking} onClose={closeBooking} />
      <ReelLightbox open={reel} onClose={closeReel} />
    </>
  );
}
