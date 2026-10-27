"use client";

import { useCallback, useState } from "react";
import { Nav } from "./ui/Nav";
import { Footer } from "./sections/Footer";
import { BookingDialog } from "./booking/BookingDialog";
import type { BookingPreset } from "./SiteShell";

/**
 * Hülle für die Rechts- und Zahlungsseiten (B.6.12): Nav und Footer der Seite,
 * Inhalt in einer Glaskarte. Text und Logik der Seiten bleiben unverändert.
 */
export function LegalShell({ children }: { children: React.ReactNode }) {
  const [booking, setBooking] = useState<BookingPreset | null>(null);
  const openBooking = useCallback(() => setBooking({}), []);
  const closeBooking = useCallback(() => setBooking(null), []);

  return (
    <>
      <Nav onBook={openBooking} />
      <main id="inhalt" className="sl-legal-page">
        {children}
      </main>
      <Footer />
      <BookingDialog preset={booking} onClose={closeBooking} />
    </>
  );
}
