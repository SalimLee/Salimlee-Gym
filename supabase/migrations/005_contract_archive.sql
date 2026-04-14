-- =====================================================
-- SALIM LEE GYM - CONTRACT ARCHIVE
-- =====================================================
-- Diese Migration in Supabase SQL Editor ausführen:
-- 1. Gehe zu supabase.com → Dein Projekt → SQL Editor
-- 2. Füge diesen gesamten Code ein
-- 3. Klick auf "Run"
--
-- ZUSÄTZLICH: Im Supabase Dashboard unter "Storage" einen
-- privaten Bucket mit dem Namen "contracts" erstellen
-- (Public = OFF). Das Skript versucht dies auch per SQL,
-- falls es nicht klappt bitte manuell erstellen.
-- =====================================================

-- =====================================================
-- CONTRACT_ARCHIVE TABLE
-- Speichert Metadaten zu allen abgeschlossenen Vertrags-PDFs.
-- Die eigentlichen PDF-Dateien liegen im Storage Bucket "contracts".
-- =====================================================
CREATE TABLE IF NOT EXISTS contract_archive (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Verknüpfung zum Mitglied (optional für manuell hochgeladene Altverträge)
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,

    -- Snapshot der Stammdaten zum Zeitpunkt der Archivierung
    member_name VARCHAR(255) NOT NULL,
    member_email VARCHAR(255),
    membership_label VARCHAR(255),

    -- Storage-Infos
    file_path TEXT NOT NULL,         -- Pfad im Storage Bucket
    file_name VARCHAR(255) NOT NULL, -- Anzeige-Dateiname
    file_size INTEGER,               -- In Bytes

    -- Manuell hochgeladen (vs. automatisch bei Vertragsabschluss)
    uploaded_manually BOOLEAN DEFAULT false NOT NULL,
    note TEXT                        -- Optionale Notiz des Admins
);

CREATE INDEX IF NOT EXISTS idx_contract_archive_member ON contract_archive(member_id);
CREATE INDEX IF NOT EXISTS idx_contract_archive_created ON contract_archive(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contract_archive_name ON contract_archive(member_name);

-- =====================================================
-- ROW LEVEL SECURITY
-- Nur authentifizierte Nutzer (Admins) dürfen lesen/schreiben.
-- Die API-Route verwendet den Service-Role-Key und umgeht RLS.
-- =====================================================
ALTER TABLE contract_archive ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Authenticated users can view contract archive"
        ON contract_archive FOR SELECT
        TO authenticated
        USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Authenticated users can insert contracts"
        ON contract_archive FOR INSERT
        TO authenticated
        WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Authenticated users can delete contracts"
        ON contract_archive FOR DELETE
        TO authenticated
        USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =====================================================
-- STORAGE BUCKET
-- Erstellt den privaten Bucket "contracts".
-- Falls das fehlschlägt, bitte manuell im Dashboard anlegen.
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'contracts',
    'contracts',
    false,  -- Private bucket (nur mit Signed URLs zugänglich)
    10485760, -- 10 MB Max
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES
-- Nur authentifizierte Admins dürfen lesen/schreiben/löschen.
-- =====================================================
DO $$ BEGIN
    CREATE POLICY "Authenticated users can read contracts bucket"
        ON storage.objects FOR SELECT
        TO authenticated
        USING (bucket_id = 'contracts');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Authenticated users can upload to contracts bucket"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'contracts');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Authenticated users can delete from contracts bucket"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (bucket_id = 'contracts');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =====================================================
-- Erfolgreich ausgeführt
-- =====================================================
