-- ─────────────────────────────────────────────────────────────────────────
-- MEMBER PHOTOS
-- Fügt members.photo_url hinzu und legt einen Storage-Bucket "member-photos"
-- an. Bucket ist public, damit das Frontend einfach <img src={url}/> rendern
-- kann — Pfade sind UUID-basiert und damit nicht ratbar.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE members ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Bucket anlegen (public read, damit Avatare einfach via URL geladen werden)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'member-photos',
  'member-photos',
  true,
  10485760, -- 10MB pro Foto reicht für Handy-Bilder
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policies: authenticated User darf lesen/schreiben/löschen
DROP POLICY IF EXISTS "member_photos_select" ON storage.objects;
CREATE POLICY "member_photos_select" ON storage.objects FOR SELECT
  TO public USING (bucket_id = 'member-photos');

DROP POLICY IF EXISTS "member_photos_insert" ON storage.objects;
CREATE POLICY "member_photos_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'member-photos');

DROP POLICY IF EXISTS "member_photos_update" ON storage.objects;
CREATE POLICY "member_photos_update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'member-photos');

DROP POLICY IF EXISTS "member_photos_delete" ON storage.objects;
CREATE POLICY "member_photos_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'member-photos');
