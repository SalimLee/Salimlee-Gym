# Salim Lee · Cinematic – Inhalts-Brief (Phase 1)

Stand: 26.10.2026 · Branch `feat/cinematic-landing`
Quelle der Texte: `lib/constants.ts` und `components/sections/*`. Neu ist nur, was in **B.14** steht (unten, Teil 2).
Dieser Brief ist die Inhalts-Grundlage für Stitch (Phase 3) und den Bau (Phase 5). Noch nichts gebaut.

---

## 1 · Jeder vorhandene Text → Runde / Abschnitt (B.6)

| Runde / Abschnitt             | Vorhandener Text                                                                                                                                                                                  | Quelle                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **Nav** (B.5.1)               | `ANGEBOTE` · `ÜBER MICH` · `PREISE` · `KONTAKT` (Anker `#angebote` `#about` `#preise` `#kontakt`); Button „BUCHEN“ → neu „Jetzt buchen“                                                           | `NAV_LINKS`, `Header.tsx`                        |
| **01 Hero** (B.6.1)           | H1 **„DEIN RING. DEIN KAMPF.“**                                                                                                                                                                   | `Hero.tsx` (Spruch über dem Boxring-Bild)        |
| 01 Hero · Lead                | Die 4 Features **Boxen & Fitness · Kraft & Ausdauer · Selbstvertrauen & Disziplin · Alle Level willkommen** → als Satz (B.14)                                                                     | `Hero.tsx` `features[]`                          |
| 01 Hero · Hairline            | „Wörthstrasse 17, Reutlingen“ · „Probetraining kostenlos“                                                                                                                                         | `CONTACT_INFO.address`, `KurseInfos.tsx` (infos) |
| 01 Hero · LIVE-Karte          | Stundenplan (Zeiten) → Live-Logik; Labels sind neu (B.14)                                                                                                                                         | `KurseInfos.tsx` (kurse), `CONTACT_INFO.hours`   |
| **02 Haltung** (B.6.2)        | **MOTIVATION. RESPEKT. ERFOLG.**                                                                                                                                                                  | `Footer.tsx` (Motto)                             |
| 02 Haltung · Schlusszeile     | „Disziplin, saubere Technik und der unverzichtbare Spaß an der Bewegung.“                                                                                                                         | `About.tsx` (Absatz 3)                           |
| **03 Kurse** (B.6.3)          | H2 **„KURSE“**; Hinweis „Bitte 15 Minuten vor Kursbeginn da sein, damit wir pünktlich starten können.“                                                                                            | `KurseInfos.tsx`                                 |
| 03 · Bahn Erwachsenenkurse    | „MO, MI & FR · Kurs 19:00–20:00 · Freies Training 17:00–19:00“, „ab 80 €/mtl.“                                                                                                                    | `KurseInfos.tsx`, `SERVICES` (group), `PRICES`   |
| 03 · Bahn Frauenkurse         | „DI & DO · 18:30–19:30“ (kein eigener Preis)                                                                                                                                                      | `KurseInfos.tsx`                                 |
| 03 · Bahn Kinderkurse         | „DI & DO · 17:00–18:00“, „ab 50 €/mtl.“, „3–14 Jahre“                                                                                                                                             | `KurseInfos.tsx`, `SERVICES` (kids), `PRICES`    |
| 03 · Bahn Boxtraining         | „Technik, Sparring & Fitness“                                                                                                                                                                     | `KurseInfos.tsx`                                 |
| 03 · Bahn Personal Training   | „Flexible Termine nach Absprache“, „60 €/Std.“, „1–4 Personen“                                                                                                                                    | `KurseInfos.tsx`, `SERVICES` (personal)          |
| 03 · Button                   | „Probetraining buchen“ (B.14)                                                                                                                                                                     | neu                                              |
| **04 Technik** (B.6.4)        | H2 **„BOXTRAINING“**, Lead „Technik, Sparring & Fitness“                                                                                                                                          | `KurseInfos.tsx` (Boxtraining)                   |
| 04 · Schlagnamen              | JAB · HOOK · RIGHT SLIP · ROLL BACK · CROSS · UPPERCUT (B.14)                                                                                                                                     | neu                                              |
| 04 · 4 Säulen                 | Boxen & Fitness · Kraft & Ausdauer · Selbstvertrauen & Disziplin · Alle Level willkommen                                                                                                          | `Hero.tsx` `features[]`                          |
| **05 Coach** (B.6.5)          | Eyebrow „ÜBER MICH“, H2 **„SALIM LEE“**; 3 Absätze + „Lass uns gemeinsam anpacken!“                                                                                                               | `About.tsx`                                      |
| 05 · Zahlenreihe              | **5+** Jahre Erfahrung · **200+** Zufriedene Mitglieder · **15+** Wöchentliche Kurse · **100 %** Engagement                                                                                       | `STATS`                                          |
| **06 Das Gym** (B.6.6)        | H2 **„DEIN RING.“** (B.14); Hairline: „Wörthstrasse 17, 72764 Reutlingen“ · Öffnungszeiten · „Bitte 15 Minuten vor Kursbeginn da sein.“                                                           | B.14, `CONTACT_INFO`, `KurseInfos.tsx`           |
| **07 Preise** (B.6.7)         | H2 **„UNSERE PREISE“**, Lead „Transparente Preise ohne versteckte Kosten“                                                                                                                         | `Pricing.tsx`                                    |
| 07 · Tabs                     | „Mitgliedschaft (Kurse)“ · „Personaltraining“ · „Probetraining“                                                                                                                                   | `Pricing.tsx` `CATEGORY_LABELS`                  |
| 07 · Zeilen                   | Alle 10 `PRICES` inkl. Badges („Beste Ersparnis“, „Flexibel“, „Einmalzahlung“, „Unverbindlich“, „Vorauszahlung“, „Halbjährlich fällig“) + „zzgl. 30 € halbjährliche Service Pauschale“            | `PRICES`, `Pricing.tsx`                          |
| 07 · Button                   | „Anfragen“ (B.14)                                                                                                                                                                                 | neu                                              |
| 07 · Fußnote                  | „\* Alle Preise inkl. MwSt. Kurszeiten: Erwachsene MO, MI & FR – Kurs 19:00–20:00, freies Training 17:00–19:00 · Kinder DI & DO – 17:00–18:00.“                                                   | `Pricing.tsx`                                    |
| **08 Dein Start** (B.6.8)     | Große Zeile **„PROBETRAINING KOSTENLOS.“**; „Unverbindlich reinschnuppern (max. 2 Kurse).“ · „Jetzt starten – einfach vorbeikommen oder anrufen.“                                                 | `SERVICES`/`KurseInfos.tsx` (infos)              |
| 08 · Buttons                  | „Jetzt buchen“ · „Anrufen“ (B.14), `tel:+4915168457943`                                                                                                                                           | neu + `CONTACT_INFO.phone`                       |
| 08 · Kontakt                  | 4 Karten: Adresse · Telefon (`+49 15168457943`) · E-Mail (`info@salimlee-gym.de`) · Öffnungszeiten; Maps-Zustimmung                                                                               | `Contact.tsx`, `CONTACT_INFO`                    |
| **Footer** (B.6.9)            | Laufband „TRAIN HARD · STAY STRONG ·“; Motto „MOTIVATION · RESPEKT · ERFOLG“; Social (Instagram `salimleegym`, TikTok `@leesalim1`, YouTube `@salimlee1378`); Impressum · Datenschutz · Copyright | `Footer.tsx`                                     |
| **Buchungsformular** (B.6.10) | Logik 1:1: `bookingSchema`, `COURSES`, `TRIAL_COURSES`, `MEMBERSHIP_OPTIONS`, `service`-String, `fetch('/api/booking')`                                                                           | `BookingModal.tsx`                               |

**Service-String (bleibt byte-identisch):** `"{Probetraining|Mitgliedschaft anfragen} – {Kurs} [– {Mitgliedschaft}]"`.

---

## 2 · Neue Zeilen (B.14 – Freigabe erbeten)

| Stelle                         | Text                                                                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Hero-Eyebrow Desktop           | `⊙ BEWEG DICH – DER FOKUS FOLGT`                                                                                                          |
| Hero-Eyebrow Touch             | `⊙ REUTLINGEN · BOXEN & FITNESS`                                                                                                          |
| Hero-Lead                      | „Boxen & Fitness, Kraft & Ausdauer, Selbstvertrauen & Disziplin. Alle Level willkommen.“                                                  |
| Hero-Button 2                  | „Film ansehen“                                                                                                                            |
| LIVE-Karte                     | `LIVE IM GYM` · „Läuft gerade“ · „Nächster Kurs“ · „Beginn“ · „bis“ · „Geöffnet“ · „bis 22:00“ · „Öffnet“ · „Probetraining“ · „kostenlos“ |
| Frauenkurs-Vorbefüllung        | Nachricht im Formular: „Frauenkurs (DI & DO · 18:30–19:30)“                                                                               |
| Rundenmarken                   | `01 — FOKUS` · `02 — HALTUNG` · `03 — KURSE` · `04 — TECHNIK` · `05 — COACH` · `06 — DAS GYM` · `07 — PREISE` · `08 — DEIN START`         |
| Technik-Schlagnamen            | `JAB` · `HOOK` · `RIGHT SLIP` · `ROLL BACK` · `CROSS` · `UPPERCUT`                                                                        |
| Gym-Headline                   | `DEIN RING.`                                                                                                                              |
| Kurs-Button                    | „Probetraining buchen“                                                                                                                    |
| Preis-Button                   | „Anfragen“                                                                                                                                |
| Start-Button 2                 | „Anrufen“                                                                                                                                 |
| KI-Chip                        | „KI-bearbeitet“                                                                                                                           |
| KI-Zeile Footer                | „Einzelne Bilder und Videos auf dieser Seite wurden mit KI-Unterstützung bearbeitet.“                                                     |
| Skip-Link                      | „Zum Inhalt springen“                                                                                                                     |
| Rechtschreibung Karten-Hinweis | „uebermittelt“ → „übermittelt“, „Datenschutzerklaerung“ → „Datenschutzerklärung“                                                          |

---

## 3 · Offene Punkte (B.15 – Antworten erbeten)

1. **Domain.** `SITE_CONFIG.url` = `https://salim-lee-gym.de`, live ist `https://www.salimlee-gym.de`. Korrigieren auf `www.salimlee-gym.de`? (Betrifft OG-Links, Metadaten, JSON-LD.) — ✅ **Ja** (Karahan, 27.10.2026): korrigieren auf `https://www.salimlee-gym.de` (Metadaten, OG, JSON-LD, Canonical). Änderung in `lib/constants.ts` → Freigabe erteilt.
2. **Kurse bis 22 Uhr.** Aktueller Stundenplan hat keinen Kurs nach 20:00 (Mo/Mi/Fr Freies Training 17–19 + Erwachsene 19–20; Di/Do Kinder 17–18, Frauen 18:30–19:30). Geöffnet bis 22:00. Gibt es Kurse nach 20:00, die noch nicht auf der Seite stehen? Wenn ja: Tag + Uhrzeit (die LIVE-Karte rechnet damit). — ✅ **Nein** (Karahan, 27.10.2026): keine Kurse nach 20:00. Stundenplan bleibt wie dokumentiert.
3. **Frauenkurs im Formular.** Reicht die Vorbefüllung der Nachricht „Frauenkurs (DI & DO · 18:30–19:30)“, oder eigene Auswahl im Formular? Eigene Auswahl ändert den `service`-Text (Admin-Ansicht) und braucht Freigabe. — ✅ **Eigene Auswahl im Formular** (Freigabe Karahan, 27.10.2026): Der Frauenkurs wird eine **echte Kurs-Option** im `BookingDialog`. Der `service`-Text ändert sich entsprechend (z. B. `Probetraining – Frauenkurse`), der Admin sieht die neue Option. Kein eigener Preis (wie heute). Umsetzung in Phase 5 (Schritt 8, BookingDialog) – `COURSES`/`TRIAL_COURSES` um „Frauenkurse“ erweitern.
4. **Bewertungen.** Echte Google-Bewertungen mit Link zeigen? Nur mit Quelle, nichts erfinden. Ohne Antwort: **keine**. — ✅ **Nein** (Karahan, 27.10.2026): keine Bewertungen auf der Seite.

**Nebenbefund (kein offener Punkt, bereits freigegeben als Ausnahme 1):** `CONTACT_INFO.hours` steht aktuell auf `Mo - Fr: 06:00 - 22:00` / `Sa - So: 08:00 - 20:00`. Wird in Phase 5 auf **täglich 10:00–22:00** geändert (`weekdays: 'Mo – So: 10:00 – 22:00'`, `weekend: ''`).

---

## 4 · Fehlende Dateien in `assets/content/generated/`

Abgleich B.11 / CONTENT-PRODUKTION.md gegen vorhandene Dateien.

**Vorhanden (13):** `gen_b01`, `gen_b01m`, `gen_b03a`, `gen_b03b`, `gen_b05`, `gen_b06`, `gen_b08`, `gen_b08m` (Bilder) · `gen_v01`, `gen_v03`, `gen_v04`, `gen_v07`, `gen_v08` (Videos).

**Fehlt:**

| Datei                                          | Zweck                          | Status / Rückfall                                                                                                                             |
| ---------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `generated/videos/gen_v01m_hero-loop_9x16.mp4` | Hero-Loop mobil (Veo aus B01m) | **Fehlt.** Laut B.11/B.7 optional → Rückfall: Poster **B01m** mit langsamem Zoom. Falls noch produzierbar: bitte nachliefern, sonst Rückfall. |
| `detail-kinder-handschuhe` (9:16)              | Kinderkurs-Bahn                | Wird in **Phase 4** per Nano-Banana erzeugt (B.11.3), B01 als Leitbild.                                                                       |
| `detail-frauen-bandagen` (9:16)                | Frauenkurs-Bahn (keine Fotos)  | Wird in **Phase 4** erzeugt.                                                                                                                  |
| `detail-preise-hintergrund` (21:9)             | Preise-Hintergrund             | Wird in **Phase 4** erzeugt.                                                                                                                  |

Alle übrigen in B.11 referenzierten Medien (echte Clips aus `raw/`, Keyframes, Referenzen) liegen lokal vor und sind seit Phase 0 in `.gitignore`.

---

## 5 · Phase-3-Entscheidungen (Karahan, 27.10.2026)

- **Hero-Variante:** **Weit** (B.6.1 Variante 1).
- **Rundenuhr:** **Ja**, aber als dezenter **Status-Readout** im selben Stil wie „Läuft gerade", die Standort-Anzeige und die Öffnungszeiten (Geist-Mono-Readout, `RUNDE 03 · 1:12`, läuft mit dem Scroll). Kein auffälliges Extra-Element.
- **Readout-Schrift:** **Geist Mono** (lokal, aus dem `geist`-Paket, OFL) für alle technischen Anzeigen (LIVE-Werte, Rundenuhr, Standort/Öffnungszeiten, Captions, KI-Chip). Headlines/Text/UI bleiben Geist Sans.
- **Schriften strikt lokal:** Geist Sans **und** Geist Mono nur als lokale woff2 via `next/font/local` — nie Google Fonts, kein CDN, sauber umgesetzt (keine Vibe-Coding-Approximation). Details in [DESIGN-CINEMATIC.md](DESIGN-CINEMATIC.md) → „Update (27.10.2026)".
