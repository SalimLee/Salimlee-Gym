-- =====================================================
-- SALIM LEE GYM - DATABASE SCHEMA
-- =====================================================
-- Diese Migration erstellt alle notwendigen Tabellen
-- für die Salim Lee Gym Website
-- =====================================================

-- Enum für Buchungsstatus
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled');

-- =====================================================
-- BOOKINGS TABLE
-- Speichert alle Buchungsanfragen
-- =====================================================
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Kontaktdaten
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    
    -- Buchungsdetails
    service VARCHAR(100) NOT NULL,
    people INTEGER DEFAULT 1 CHECK (people >= 1 AND people <= 10),
    preferred_date DATE,
    message TEXT,
    
    -- Status
    status booking_status DEFAULT 'pending' NOT NULL,
    
    -- Admin Notizen
    admin_notes TEXT
);

-- Index für häufige Queries
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX idx_bookings_email ON bookings(email);

-- =====================================================
-- SERVICES TABLE
-- Speichert die verfügbaren Services (optional für CMS)
-- =====================================================
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    title VARCHAR(100) NOT NULL,
    subtitle VARCHAR(100),
    price VARCHAR(50) NOT NULL,
    features TEXT[] DEFAULT '{}',
    icon VARCHAR(50) DEFAULT 'Users',
    
    -- Sortierung & Status
    display_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true
);

CREATE INDEX idx_services_active ON services(active, display_order);

-- =====================================================
-- PRICES TABLE
-- Speichert die Preisliste (optional für CMS)
-- =====================================================
CREATE TABLE IF NOT EXISTS prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    name VARCHAR(255) NOT NULL,
    price VARCHAR(50) NOT NULL,
    discount VARCHAR(100),
    category VARCHAR(50) NOT NULL, -- 'personal', 'group', 'kids'
    
    -- Sortierung & Status
    display_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true
);

CREATE INDEX idx_prices_category ON prices(category, display_order);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;

-- Bookings: Jeder kann erstellen, nur Admins können lesen
CREATE POLICY "Jeder kann Buchungen erstellen" ON bookings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Nur Admins können Buchungen lesen" ON bookings
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        auth.jwt() ->> 'role' = 'admin'
    );

-- Services & Prices: Öffentlich lesbar
CREATE POLICY "Services sind öffentlich lesbar" ON services
    FOR SELECT USING (active = true);

CREATE POLICY "Preise sind öffentlich lesbar" ON prices
    FOR SELECT USING (active = true);

-- =====================================================
-- TRIGGER: Updated At
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prices_updated_at
    BEFORE UPDATE ON prices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA: Services
-- =====================================================
INSERT INTO services (title, subtitle, price, features, icon, display_order) VALUES
    ('Personaltraining', '1-4 Personen', 'ab 45€', 
     ARRAY['Individuelle Betreuung', 'Flexible Zeiten', 'Maßgeschneidertes Training', 'Ernährungsberatung'], 
     'Users', 1),
    ('Gruppenkurse', 'Boxen & Fitness', 'ab 15€', 
     ARRAY['Motivierende Atmosphäre', 'Feste Kurszeiten', 'Alle Fitnesslevel', 'Community-Gefühl'], 
     'Award', 2),
    ('Kinderkurse', 'Ab 6 Jahren', 'ab 12€', 
     ARRAY['Spielerisches Training', 'Selbstvertrauen aufbauen', 'Koordination & Kraft', 'Erfahrene Trainer'], 
     'Calendar', 3);

-- =====================================================
-- SEED DATA: Prices
-- =====================================================
INSERT INTO prices (name, price, discount, category, display_order) VALUES
    ('Einzelstunde Personaltraining', '45€', NULL, 'personal', 1),
    ('10er Karte Personaltraining', '400€', '50€ Ersparnis', 'personal', 2),
    ('Einzelne Gruppenstunde', '15€', NULL, 'group', 3),
    ('10er Karte Gruppenkurse', '120€', '30€ Ersparnis', 'group', 4),
    ('Monatskarte Gruppenkurse', '89€', 'Unbegrenzt trainieren', 'group', 5),
    ('Kinderkurs Einzelstunde', '12€', NULL, 'kids', 6),
    ('10er Karte Kinderkurse', '100€', '20€ Ersparnis', 'kids', 7);
