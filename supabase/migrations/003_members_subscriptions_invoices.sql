-- =====================================================
-- SALIM LEE GYM - MEMBERS, SUBSCRIPTIONS & INVOICES
-- =====================================================
-- Diese Migration in Supabase SQL Editor ausführen:
-- 1. Gehe zu supabase.com → Dein Projekt → SQL Editor
-- 2. Füge diesen gesamten Code ein
-- 3. Klick auf "Run"
-- =====================================================

-- Enum-Typen erstellen
DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled', 'paused');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE invoice_status AS ENUM ('open', 'paid', 'overdue', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =====================================================
-- MEMBERS TABLE
-- Zentrale Mitgliederverwaltung
-- =====================================================
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    notes TEXT,
    active BOOLEAN DEFAULT true NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_members_name ON members(name);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_active ON members(active);

-- =====================================================
-- SUBSCRIPTIONS TABLE (Abos)
-- Verwaltet Mitgliedschafts-Abonnements
-- =====================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,          -- z.B. "Monatskarte Gruppenkurse"
    type VARCHAR(50) NOT NULL DEFAULT 'monthly', -- 'monthly' oder 'punch_card'
    start_date DATE NOT NULL,
    end_date DATE,                        -- NULL bei offenen Punch Cards
    total_units INTEGER,                  -- Für 10er Karten etc.
    remaining_units INTEGER,              -- Verbleibende Einheiten
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    status subscription_status DEFAULT 'active' NOT NULL,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_member ON subscriptions(member_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);

-- =====================================================
-- INVOICES TABLE (Rechnungen)
-- Verwaltet Rechnungen für Mitglieder
-- =====================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status invoice_status DEFAULT 'open' NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_invoices_member ON invoices(member_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

-- =====================================================
-- RLS aktivieren
-- =====================================================
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies - Nur für eingeloggte Admins
-- =====================================================

-- Members
DROP POLICY IF EXISTS "Admins können Mitglieder lesen" ON members;
CREATE POLICY "Admins können Mitglieder lesen" ON members
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins können Mitglieder erstellen" ON members;
CREATE POLICY "Admins können Mitglieder erstellen" ON members
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins können Mitglieder aktualisieren" ON members;
CREATE POLICY "Admins können Mitglieder aktualisieren" ON members
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins können Mitglieder löschen" ON members;
CREATE POLICY "Admins können Mitglieder löschen" ON members
    FOR DELETE USING (auth.role() = 'authenticated');

-- Subscriptions
DROP POLICY IF EXISTS "Admins können Abos lesen" ON subscriptions;
CREATE POLICY "Admins können Abos lesen" ON subscriptions
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins können Abos erstellen" ON subscriptions;
CREATE POLICY "Admins können Abos erstellen" ON subscriptions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins können Abos aktualisieren" ON subscriptions;
CREATE POLICY "Admins können Abos aktualisieren" ON subscriptions
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins können Abos löschen" ON subscriptions;
CREATE POLICY "Admins können Abos löschen" ON subscriptions
    FOR DELETE USING (auth.role() = 'authenticated');

-- Invoices
DROP POLICY IF EXISTS "Admins können Rechnungen lesen" ON invoices;
CREATE POLICY "Admins können Rechnungen lesen" ON invoices
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins können Rechnungen erstellen" ON invoices;
CREATE POLICY "Admins können Rechnungen erstellen" ON invoices
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins können Rechnungen aktualisieren" ON invoices;
CREATE POLICY "Admins können Rechnungen aktualisieren" ON invoices
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins können Rechnungen löschen" ON invoices;
CREATE POLICY "Admins können Rechnungen löschen" ON invoices
    FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- TRIGGER: Updated At für neue Tabellen
-- =====================================================
DROP TRIGGER IF EXISTS update_members_updated_at ON members;
CREATE TRIGGER update_members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
