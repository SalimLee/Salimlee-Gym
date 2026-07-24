-- =====================================================
-- R6: Feiner Zahlungsstatus für Rechnungen
-- =====================================================
-- ADDITIV & NICHT-DESTRUKTIV: nur neue, NULLbare Spalten. Bestehende Rechnungen
-- bleiben komplett unverändert (Werte = NULL). Der Code füllt die Felder ab jetzt
-- beim Stripe-Sync; solange sie NULL sind, fällt das Frontend auf die bisherige
-- Logik (Status + Fälligkeitsdatum) zurück. Kein Kunde ist betroffen.
--
-- Ausführen: Supabase → SQL Editor → einfügen → Run.
-- =====================================================

-- Feiner Stripe-Zahlungsstatus, abgeleitet aus Invoice- + PaymentIntent-Status:
--   'paid'            → bezahlt
--   'processing'      → SEPA-Lastschrift läuft (3–5 Werktage)
--   'retry_scheduled' → Stripe hat einen automatischen Wiederholungsversuch geplant
--   'failed'          → letzter Einzug fehlgeschlagen, kein Versuch geplant → mahnen
--   'pending'         → offen, noch kein Versuch
--   'void'            → storniert
--   'uncollectible'   → uneinbringlich abgeschrieben
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_state TEXT;

-- Anzahl der (fehlgeschlagenen) Zahlungsversuche laut Stripe
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS attempt_count INTEGER;

-- Datum des nächsten von Stripe geplanten Einzugsversuchs (falls vorhanden)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS next_attempt_date DATE;

CREATE INDEX IF NOT EXISTS idx_invoices_payment_state ON invoices(payment_state);
