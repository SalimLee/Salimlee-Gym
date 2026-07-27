-- =====================================================
-- Vertrags-Erinnerung: Anti-Spam-Marker
-- =====================================================
-- ADDITIV & NICHT-DESTRUKTIV: eine neue, NULLbare Spalte (IF NOT EXISTS).
-- Bestehende Abos bleiben unverändert. Der Cron sendet die Vertrags-Erinnerung
-- (Mindestlaufzeit endet bald → monatlich kündbar) nur EINMAL pro Abo und setzt danach
-- diesen Zeitstempel, damit nicht täglich dieselbe Mail rausgeht.
--
-- Ausführen: Supabase → SQL Editor → einfügen → Run.
-- =====================================================

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS contract_reminder_sent_at TIMESTAMPTZ;
