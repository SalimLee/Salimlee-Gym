-- =====================================================
-- R7: Stabile Verknüpfung Supabase ↔ Stripe (gegen Sync-Drift)
-- =====================================================
-- ADDITIV & NICHT-DESTRUKTIV: nur neue, NULLbare Spalten + Indizes mit IF NOT EXISTS.
-- Bestehende Mitglieder/Rechnungen bleiben unverändert. Der Code befüllt die Felder
-- ab jetzt best-effort beim Stripe-Sync (Backfill passiert automatisch nach und nach).
-- Kein Kunde ist betroffen.
--
-- Ausführen: Supabase → SQL Editor → einfügen → Run.
-- =====================================================

-- Feste Stripe-Customer-Verknüpfung direkt am Mitglied (bisher nur an subscriptions).
-- Ermöglicht eindeutiges Matching von Stripe-Rechnungen zum Mitglied, auch wenn keine
-- aktive Subscription (mehr) existiert.
ALTER TABLE members ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Zugehörige Stripe-Subscription direkt an der Rechnung — damit klar ist, zu welchem
-- Abo eine Rechnung gehört (verhindert falsch zugeordnete "offene" Rechnungen).
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_members_stripe_customer ON members(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_subscription ON invoices(stripe_subscription_id);
