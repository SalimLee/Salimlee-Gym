-- =====================================================
-- SALIM LEE GYM - ADMIN SETUP
-- =====================================================
-- Diese Migration in Supabase SQL Editor ausführen:
-- 1. Gehe zu supabase.com → Dein Projekt → SQL Editor
-- 2. Füge diesen gesamten Code ein
-- 3. Klick auf "Run"
-- =====================================================

-- SCHRITT 1: Erstelle den Enum-Typ (falls noch nicht vorhanden)
DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- SCHRITT 2: Erstelle die Tabellen
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    service VARCHAR(100) NOT NULL,
    people INTEGER DEFAULT 1 CHECK (people >= 1 AND people <= 10),
    preferred_date DATE,
    message TEXT,
    status booking_status DEFAULT 'pending' NOT NULL,
    admin_notes TEXT
);

CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    title VARCHAR(100) NOT NULL,
    subtitle VARCHAR(100),
    price VARCHAR(50) NOT NULL,
    features TEXT[] DEFAULT '{}',
    icon VARCHAR(50) DEFAULT 'Users',
    display_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    name VARCHAR(255) NOT NULL,
    price VARCHAR(50) NOT NULL,
    discount VARCHAR(100),
    category VARCHAR(50) NOT NULL,
    display_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true
);

-- SCHRITT 3: Indizes erstellen
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(email);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active, display_order);
CREATE INDEX IF NOT EXISTS idx_prices_category ON prices(category, display_order);

-- SCHRITT 4: RLS aktivieren
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;

-- SCHRITT 5: Alte Policies löschen (falls vorhanden)
DROP POLICY IF EXISTS "Jeder kann Buchungen erstellen" ON bookings;
DROP POLICY IF EXISTS "Nur Admins können Buchungen lesen" ON bookings;
DROP POLICY IF EXISTS "Services sind öffentlich lesbar" ON services;
DROP POLICY IF EXISTS "Preise sind öffentlich lesbar" ON prices;
DROP POLICY IF EXISTS "Admins können Buchungen aktualisieren" ON bookings;

-- SCHRITT 6: Neue Policies erstellen
-- Buchungen: Jeder kann erstellen (für das Buchungsformular)
CREATE POLICY "Jeder kann Buchungen erstellen" ON bookings
    FOR INSERT WITH CHECK (true);

-- Buchungen: Eingeloggte User können lesen (Admin-Dashboard)
CREATE POLICY "Nur Admins können Buchungen lesen" ON bookings
    FOR SELECT USING (auth.role() = 'authenticated');

-- Buchungen: Eingeloggte User können aktualisieren (Status ändern)
CREATE POLICY "Admins können Buchungen aktualisieren" ON bookings
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Services & Preise: Öffentlich lesbar
CREATE POLICY "Services sind öffentlich lesbar" ON services
    FOR SELECT USING (active = true);

CREATE POLICY "Preise sind öffentlich lesbar" ON prices
    FOR SELECT USING (active = true);

-- SCHRITT 7: Updated-At Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_prices_updated_at ON prices;
CREATE TRIGGER update_prices_updated_at
    BEFORE UPDATE ON prices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- SCHRITT 8: Seed Data (nur wenn Tabellen leer sind)
INSERT INTO services (title, subtitle, price, features, icon, display_order)
SELECT 'Personaltraining', '1-4 Personen', 'ab 45€',
       ARRAY['Individuelle Betreuung', 'Flexible Zeiten', 'Maßgeschneidertes Training', 'Ernährungsberatung'],
       'Users', 1
WHERE NOT EXISTS (SELECT 1 FROM services LIMIT 1);

INSERT INTO services (title, subtitle, price, features, icon, display_order)
SELECT 'Gruppenkurse', 'Boxen & Fitness', 'ab 15€',
       ARRAY['Motivierende Atmosphäre', 'Feste Kurszeiten', 'Alle Fitnesslevel', 'Community-Gefühl'],
       'Award', 2
WHERE NOT EXISTS (SELECT 1 FROM services WHERE title = 'Gruppenkurse');

INSERT INTO services (title, subtitle, price, features, icon, display_order)
SELECT 'Kinderkurse', 'Ab 6 Jahren', 'ab 12€',
       ARRAY['Spielerisches Training', 'Selbstvertrauen aufbauen', 'Koordination & Kraft', 'Erfahrene Trainer'],
       'Calendar', 3
WHERE NOT EXISTS (SELECT 1 FROM services WHERE title = 'Kinderkurse');

INSERT INTO prices (name, price, discount, category, display_order)
SELECT * FROM (VALUES
    ('Einzelstunde Personaltraining', '45€', NULL::VARCHAR, 'personal', 1),
    ('10er Karte Personaltraining', '400€', '50€ Ersparnis', 'personal', 2),
    ('Einzelne Gruppenstunde', '15€', NULL::VARCHAR, 'group', 3),
    ('10er Karte Gruppenkurse', '120€', '30€ Ersparnis', 'group', 4),
    ('Monatskarte Gruppenkurse', '89€', 'Unbegrenzt trainieren', 'group', 5),
    ('Kinderkurs Einzelstunde', '12€', NULL::VARCHAR, 'kids', 6),
    ('10er Karte Kinderkurse', '100€', '20€ Ersparnis', 'kids', 7)
) AS v(name, price, discount, category, display_order)
WHERE NOT EXISTS (SELECT 1 FROM prices LIMIT 1);
