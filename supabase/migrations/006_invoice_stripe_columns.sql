-- =====================================================
-- INVOICES TABLE: Stripe-Integration Spalten
-- Erweitert die bestehende invoices Tabelle um Stripe-Felder
-- =====================================================

-- Quelle der Rechnung: 'manual' (Coach) oder 'stripe' (automatisch synchronisiert)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

-- Stripe Invoice ID (z.B. in_1abc...)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT;

-- Gecachte PDF-URL von Stripe
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_invoice_pdf_url TEXT;

-- Unique Index auf stripe_invoice_id um Duplikate zu verhindern
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id
  ON invoices(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;

-- Index auf source fuer schnelles Filtern
CREATE INDEX IF NOT EXISTS idx_invoices_source ON invoices(source);
