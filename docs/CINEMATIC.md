# Salim Lee · Cinematic Redesign – Plan und Prompt für Claude Code

Version 1.2 · 26.10.2026 (Antworten von Karahan eingearbeitet) · für das Repo `landing-page-web` (github.com/SalimLee/Salimlee-Gym, live: www.salimlee-gym.de)

## So nutzt du das

1. **Zuerst den Content produzieren:** `docs/CONTENT-PRODUKTION.md` abarbeiten (Nano Banana Pro, Veo 3.1). Die Ergebnisse kommen mit festen Namen nach `assets/content/generated/`.
2. Diese Datei liegt im Repo unter `docs/CINEMATIC.md`. Die Bildschirmaufnahme der Referenz liegt unter `docs/referenz/stride-nine-aufnahme.mp4`. Beides bleibt lokal bzw. `docs/referenz/` kommt in die `.gitignore`.
3. Claude Code (Desktop, Modell Opus) im Repo öffnen und den Text aus **Teil C** schicken. Claude Code liest Teil A und B aus dieser Datei.
4. Claude Code hält an vier Stellen an (**STOPP**). Gearbeitet wird nur auf dem Branch `feat/cinematic-landing`. Jeder Push erzeugt über die Git-Integration eine Vercel-Preview. Nach `main` geht es erst, wenn du den PR mergst.

**Aufbau**

- **Teil A** hält fest, was entschieden ist.
- **Teil B** ist die verbindliche Design-, Motion- und Technik-Spezifikation.
- **Teil C** ist der Prompt in acht Phasen nach der Anleitung „Claude Code baut dir 10.000€-Webseiten“: Skills, MCPs, Referenz, STOPP-Zeilen.

---

# TEIL A — Entscheidungen

| Thema | Entscheidung |
|---|---|
| Referenz | **Stride Nine** auf getlayers.ai (`https://www.getlayers.ai/templates?layer=stride-nine`) und Karahans Bildschirmaufnahme davon. Übernommen werden **Farben, Typografie, Hero-Aufbau und die Art der Bewegung**, nicht die Inhalte. Statt Laufen geht es um Boxen. |
| Gesperrtes Template | Stride Nine ist ein kostenpflichtiges Premium-Template. **Nicht versuchen, Code, Prompt oder Dateien davon zu beschaffen.** Öffentlich sichtbar ist nur der Hero (Vorschau-Videos, Desktop und Mobil). Alles unterhalb des Heros ist unser eigener Entwurf in dieser Designsprache. |
| Umfang | **Nur die öffentliche Seite.** `/` wird neu gebaut. `/impressum`, `/datenschutz`, `/zahlung-erfolgreich` und `/zahlung-abgebrochen` bekommen nur die neue Optik, kein Text und keine Logik ändert sich. |
| Tabu | `app/admin/**`, `app/api/**`, `components/admin/**`, alle bestehenden Dateien in `lib/**` (Stripe, Supabase, PDFs), `supabase/**`, `scripts/*.mjs` (Stripe-Skripte), `types/database.types.ts`, die Crons in `vercel.json`, `.env*` und die `DESIGN.md` im Root (gehört zum Admin). |
| Freigegebene Ausnahmen | Nur diese drei Stellen außerhalb der öffentlichen Seite dürfen geändert werden (Freigabe Karahan, 26.10.2026): **(1)** `lib/constants.ts` → `CONTACT_INFO.hours` auf **täglich 10:00–22:00**. **(2)** `app/globals.css` → die beiden `@import` von Google Fonts durch `@font-face` mit **lokalen** Barlow- und Inter-Dateien ersetzen, die Optik des Admins bleibt gleich. **(3)** `app/layout.tsx` → die beiden `preconnect`-Links zu `fonts.googleapis.com` und `fonts.gstatic.com` entfernen. Alles Weitere nur nach Rückfrage. |
| Buchung | Das Buchungsformular bekommt eine neue Optik. **Schema, Ablauf und der Request an `/api/booking` bleiben Byte für Byte gleich** (Felder und das `service`-Format, das der Admin-Bereich anzeigt). |
| Inhalt | **Die Texte bleiben.** Quellen sind `lib/constants.ts` und die Komponenten in `components/sections/`. Neu sind nur die Zeilen aus B.14, nach Freigabe in Phase 1. Keine erfundenen Zahlen, Bewertungen oder Zitate. |
| Zahlen und Preise | **Bestätigt:** `STATS` (5+ Jahre Erfahrung, 200+ zufriedene Mitglieder, 15+ wöchentliche Kurse, 100 % Engagement) und alle Preise in `lib/constants.ts`. Die Zahlenreihe kommt auf die Seite. |
| Farben | Die Palette aus der Stride-Vorschau: **Nacht und Kobalt** als Fläche, **Weiß** für Schrift, **Signal-Orange** als sparsamer Akzent (B.4.1). Das alte Rot `#b00000` und das Neon-Glühen entfallen auf der öffentlichen Seite. Der Admin behält seine Farben. |
| Typografie | **Geist** (Vercel, Lizenz OFL), wie in der Vorschau. Ermittelt per Glyphenvergleich mit der Aufnahme: Die Headline „STARTS“ deckt sich mit Geist Bold zu 83 % (Archivo 79 %, Inter 74 %), der Fließtext mit Geist Regular zu 73 % (alle anderen Kandidaten ≤ 52 %). Headlines in Geist 700 und Versalien, Text und UI in Geist 400/500. **Nur lokale Dateien im Repo**, eingebunden mit `next/font/local`. Nie Google Fonts, auch nicht über `next/font/google`. Barlow entfällt auf der öffentlichen Seite. |
| Logo | Bleibt. Quelle ist das weiße Logo aus dem Logokoffer (`assets/logo.png`, 4884 px, transparent). Die Datei `public/logo.svg` ist ein nachgebauter Platzhalter und wird nicht verwendet. |
| Medien | Nur die freigegebenen Dateien aus `assets/content/generated/` und echte Ausschnitte aus `assets/content/raw/`. **Claude Code generiert keine Bilder von Salim oder anderen echten Menschen.** Der Nano-Banana-MCP darf nur personenfreie Detailbilder erzeugen (B.11). |
| Dramaturgie | **Acht Runden** wie ein Kampf: Fokus → Haltung → Kurse → Technik → Coach → Das Gym → Preise → Dein Start. Jede Runde trägt eine Rundenmarke. |
| Stack | **Next.js 14 bleibt** (kein Upgrade, Admin und Stripe hängen daran). Tailwind 3.4 nur **ergänzend** um den Namensraum `sl`. Neu: GSAP + ScrollTrigger, Lenis, OGL (WebGL für den Hero). framer-motion (vorhanden) für Modal und kleine UI-Zustände. |
| Uilora | Komponenten von uilora.com dienen als Bauvorlage und werden in unseren Tokens **nachgebaut**. **Kein Uilora-MCP, kein Uilora-Paket.** Claude Code öffnet die verlinkten Seiten aus B.12 im Browser, sieht sich die Vorschau an und baut nach. Gesperrten Code nicht umgehen. |
| Hero | **Mit Coach Salim** (entschieden). Grundlage ist B01. Alle drei Stitch-Varianten zeigen Salim (B.6.1). |
| Einwilligungen | Liegen vor. Die Sportler in raw_01 und raw_04 haben zugestimmt, die Videos sind frei nutzbar (Karahan, 26.10.2026). Die KI-Kennzeichnung gilt trotzdem, sie hängt nicht an der Einwilligung. |
| Git | Claude Code darf auf **`feat/cinematic-landing`** committen und pushen, unter Karahans Namen aus `git config`, ohne Co-Authored-By und ohne KI-Vermerk. **Nie** auf `main` pushen, nie mergen, nie force-pushen. Rohvideos und 4K-Generierungen kommen **nicht** ins Git. |
| Deploy | Das bestehende Vercel-Projekt deployt per Git-Integration. **Kein neues Vercel-Projekt anlegen.** Der Vercel-MCP wird nur zum Lesen genutzt (Preview-URL, Build-Logs, Laufzeitfehler), sofern der Token Zugriff auf das Projekt hat. |
| Testbuchungen | **Keine Buchung absenden**, weder in der Preview noch live. Previews nutzen wahrscheinlich dieselbe Supabase-Datenbank und denselben Mailversand wie die Live-Seite. Der Request wird per Test mit gemocktem `fetch` geprüft. |
| KI-Kennzeichnung | Medien, die mit KI erzeugt oder erweitert wurden, tragen einen dezenten, sichtbaren Chip „KI-bearbeitet“ (AI Act Art. 50 Abs. 4, gilt seit 02.08.2026). Dazu eine Zeile im Footer. |
| Datenschutz | Keine neuen Dienstleister. Schriften, GSAP, Lenis, OGL und Videos werden selbst ausgeliefert. Nach dem Umbau gibt es **auf keiner Seite** mehr eine Anfrage an Google Fonts, auch nicht im Admin. Google Maps lädt weiter erst nach Klick. |

---

# TEIL B — Spezifikation

## B.0 Das Erlebnis

Die Seite öffnet wie eine Sportkampagne: Salim an den Pratzen, ein Sportler schlägt die Gerade, darüber ein tiefblauer Himmel. Links steht in weißen Versalien „DEIN RING. DEIN KAMPF.“, die Zeilen schieben sich von unten durch feine Linien ins Bild. Der Fokus folgt der Maus: Wo der Zeiger ist, wird das Bild scharf, der Rest bleibt weich, und die Luft zieht sich hinter der Bewegung her. Unten rechts zeigt eine Glaskarte, was heute im Gym läuft.

Beim Scrollen wird es Abend. In der Blauen Stunde boxt Salim im Nebel, und die drei Worte der Marke füllen sich nacheinander: MOTIVATION. RESPEKT. ERFOLG. Danach folgen die Kurse als Bahnen aus Hochkant-Videos, die Technik als Vogelperspektive mit synchron aufleuchtenden Schlagnamen, Salim im Porträt, das Gym mit seinem Hexagon-Licht, die Preise in Glas, und zum Schluss Salim allein auf dem Nebelhügel mit dem Seil: „PROBETRAINING KOSTENLOS.“

**Prinzipien**

- Zurückhaltend und präzise. Bewegung hat einen Grund: Fokus, Rhythmus, Schlag.
- Jeder Abschnitt muss als Standbild wie ein Kampagnenmotiv aussehen.
- In jeder Runde ist ein Weg zur Buchung sichtbar, mindestens über den Nav-Button.
- Echt vor generiert: Wo es echtes Material gibt, wird es genutzt.

## B.1 Conversion

- **Primärer CTA überall:** „Jetzt buchen“ öffnet das Buchungsformular (bisher `BookingModal`).
- **Vorauswahl:** Aus Kurs-Bahnen, Preiszeilen und „Dein Start“ öffnet das Formular mit passendem Anliegen und Kurs, bei Preisen auch mit der Mitgliedschaft. Gesendet wird exakt wie heute.
- **Sekundär:** „Film ansehen“ (Reel-Lightbox), „Anrufen“ (`tel:`), E-Mail, Google Maps nach Zustimmung.
- **Keine Tracker** neu. Falls Vercel Analytics schon aktiv ist, bleibt es so.

## B.2 Tech-Stack (verbindlich)

| Bereich | Wahl | Hinweis |
|---|---|---|
| Basis | Next.js 14.2 App Router, React 18, TypeScript | Kein Upgrade. `npm run build` und `npm run lint` müssen grün bleiben. |
| Styling | Tailwind 3.4, neue Tokens unter `theme.extend` im Namensraum `sl` (B.4) | Bestehende Paletten `brand`, `dark`, `admin`, `status` unverändert lassen. Keine Hex-Werte in Komponenten. |
| Schriften | `next/font/local` mit `Geist-Variable.woff2` (wght 100–900) als `--font-sl` | Die Datei liegt im Repo (B.3.1). Kein `next/font/google`, kein CDN. |
| Scroll | **Lenis** (`lerp 0.1`, `syncTouch: false`), über den GSAP-Ticker | Bei `prefers-reduced-motion` aus |
| Motion | **GSAP 3.13+** mit ScrollTrigger und SplitText (seit 3.13 kostenlos), eine Timeline **pro Abschnitt** | framer-motion nur für Modal, Tabs, Akkordeon-Zustände |
| WebGL | **OGL** (Renderer, Texture, Flowmap) nur für das FocusField im Hero | dynamischer Import, nur Client, nur Desktop mit Maus |
| Video | natives `<video muted playsInline loop>`, H.264-MP4, optional AV1 zuerst, Poster als AVIF | kein Video-Scrubbing per Scroll |
| Uilora | die Seiten aus B.12 im Browser ansehen | kein MCP, kein Paket, nachbauen |
| Deploy | Vercel, Preview pro Branch über Git-Integration | Vercel-MCP nur lesend |

GSAP, Lenis und OGL werden nur im Client geladen. Der Server rendert alle Texte als HTML.

## B.3 Architektur

### B.3.1 Isolation vom Admin

```
app/
  layout.tsx                   bleibt, nur die zwei Google-preconnects fliegen raus (Ausnahme 3)
  globals.css                  bleibt, nur @import Google Fonts → lokales @font-face (Ausnahme 2)
  (site)/                      NEU, Route Group ohne Einfluss auf URLs
    fonts/                     Geist-Variable.woff2 + OFL.txt (aus dem offiziellen npm-Paket „geist“ von Vercel kopiert)
    layout.tsx                 Schriften, site.css, Lenis, Cursor-Punkt, Korn, Skip-Link
    site.css                   Basis der öffentlichen Seite, alles unter .sl-site
    page.tsx                   die neue Landingpage (app/page.tsx wird hierher verschoben)
    impressum/page.tsx         verschoben, nur Optik
    datenschutz/page.tsx       verschoben, nur Optik
    zahlung-erfolgreich/page.tsx  verschoben, nur Optik
    zahlung-abgebrochen/page.tsx  verschoben, nur Optik
  admin/**  api/**             unverändert
components/site/               NEU
  motion/      lenis.ts · gsap.ts · useReducedMotion.ts · useInView.ts
  hero/        Hero.tsx · FocusField.ts · shaders/focus.frag · LiveCard.tsx · schedule.ts
  sections/    Haltung.tsx · Kurse.tsx · Technik.tsx · Coach.tsx · Gym.tsx · Preise.tsx · Start.tsx · Kontakt.tsx · Footer.tsx
  ui/          Nav.tsx · Button.tsx · GlassCard.tsx · Hairline.tsx · RoundMark.tsx · CursorDot.tsx · KiChip.tsx · CinematicVideo.tsx · ReelLightbox.tsx · Grain.tsx
  booking/     BookingDialog.tsx   (neue Optik, Logik 1:1 aus components/sections/BookingModal.tsx)
content/
  site.ts      typisierte Inhalte der Landingpage, liest PRICES, SERVICES, CONTACT_INFO, NAV_LINKS aus lib/constants.ts
  media.ts     generiert: Pfade, Maße, Poster, Hashes aller Medien
public/
  media/       aufbereitete Videos und Bilder (B.11)
  brand/       Logo in Web-Größen, Favicon
  fonts/       barlow/ (400–900) und inter/ (variabel) für den Admin, je mit OFL.txt
scripts/cinematic/
  media.mjs    ffmpeg + sharp: Schnitte, LUT, Kodierung, Poster, Tabelle
  lut.py       berechnet die Farb-LUTs (B.11.2)
docs/
  CINEMATIC.md · CONTENT-PRODUKTION.md · DESIGN-CINEMATIC.md · CINEMATIC-BRIEF.md · qa/
```

- Die alten Komponenten in `components/sections/` und `components/ui/` bleiben bis zum Schluss liegen. Sie werden im letzten Commit vor dem PR entfernt, nachdem geprüft ist, dass nichts mehr darauf verweist (`grep`). Der Admin nutzt sie nachweislich nicht.
- Die globale Basis aus `globals.css` (Barlow, rote Scrollbar) wirkt auch auf `/`. In `site.css` wird sie für `.sl-site` überschrieben, die Scrollbar über `html:has(.sl-site)`.
- **Schriften lokal:** Geist kommt aus dem offiziellen npm-Paket `geist` (Vercel). Die Datei wird einmal nach `app/(site)/fonts/` kopiert, das Paket muss danach nicht installiert bleiben. Barlow und Inter für den Admin kommen aus den offiziellen Quellen (Barlow: github.com/jpt/barlow, Inter: github.com/rsms/inter, Release `InterVariable.woff2`) oder aus den `@fontsource`-Paketen, als Dateien nach `public/fonts/`. Nie von `fonts.googleapis.com` oder `fonts.gstatic.com`.

### B.3.2 Scroll-Map (Desktop)

Kein durchgehend fixierter Bühnenbereich, sondern Abschnitte im normalen Fluss mit drei fixierten Momenten.

| Runde | Abschnitt | Höhe | Fixiert | Was passiert |
|---|---|---|---|---|
| 01 | Hero „Fokus“ | 100 svh | nein | Intro-Reveal, FocusField, LIVE-Karte. Beim Herausscrollen schrumpft das Video in einen Rahmen. |
| 02 | Haltung | 260 vh | **ja** | Nebel-Video, drei Worte füllen sich nacheinander, der Fokus zieht scharf |
| 03 | Kurse | auto | nein | fünf Bahnen mit Hochkant-Videos, Akkordeon |
| 04 | Technik | 220 vh | **ja** | Vogelperspektive, Schlagnamen synchron zum Video, vier Säulen nacheinander |
| 05 | Coach | auto | nein | 21:9-Porträt, Fokus zieht beim Eintritt scharf, Text in Glaskarte |
| 06 | Das Gym | auto | nein | Ring-Bild mit Parallaxe, Hexagon-Linien zeichnen sich |
| 07 | Preise | auto | nein | Tabs, Glas-Zeilen |
| 08 | Dein Start | 160 vh | **ja** (kurz) | Seilspringen im Nebel, große Zeile, dann Kontakt im Fluss |
| — | Kontakt, Footer | auto | nein | Karten, Karte nach Zustimmung, Laufband |

Die Werte stehen zentral in `components/site/motion/scroll-map.ts`. Mobil: siehe B.7.

## B.4 Design-Tokens

### B.4.1 Farben

Gemessen aus der Stride-Vorschau (Video-Standbilder). In Phase 2 mit eigenen Standbildern nachmessen und nur bei klarer Abweichung anpassen.

```ts
// tailwind.config.ts → theme.extend.colors.sl  (ergänzen, nichts Bestehendes ändern)
sl: {
  night:   { 950: '#07131F', 900: '#0E273D', 800: '#132E48' }, // Fläche, oberer Himmel
  cobalt:  { 600: '#224565', 400: '#436886' },                 // Himmel Mitte, Horizont
  mist:    { 50: '#FFFFFF', 100: '#F2F5F8', 200: '#D5DEE7', 400: '#A9B8C6', 600: '#74879A' }, // Text
  signal:  { 300: '#F28A55', 500: '#E0622C', 600: '#B8461C' }, // Akzent
}
// Linien: rgba(255,255,255,.14) · stark .24
// Glas hell (Buttons):  rgba(255,255,255,.14) + backdrop-blur 12px, kein Rand
// Glas dunkel (Karten): rgba(7,19,31,.45) + backdrop-blur 18px + 1px rgba(255,255,255,.10)
```

**Regeln**

- Pro Ansicht etwa 85 % Nacht/Kobalt und Weiß, 10 % Bild, höchstens 5 % Signal-Orange.
- Signal-Orange nur für: den Live-Punkt, die Badge „Beste Ersparnis“, den aktiven Schlagnamen, den Unterstrich aktiver Tabs. **Nie** für Fließtext oder große Flächen.
- Primärbutton ist **weiß** mit dunkler Schrift (wie in der Vorschau), nicht orange.
- Text auf Video immer über einem Verlauf: links `linear-gradient(90deg, rgba(7,19,31,.62) 0%, rgba(7,19,31,.18) 48%, transparent 72%)`, oben für die Nav `rgba(7,19,31,.5) → transparent` auf 160 px.

### B.4.2 Typografie

Eine Familie für alles: **Geist** (variabel). Gemessen an der Aufnahme: Die H1 der Vorschau ist etwa 7,1 vw groß, Zeilenabstand ≈ 0.88, Gewicht zwischen 650 und 700, sehr eng gesetzt.

| Rolle | Schrift | Gewicht | Größe (1440 px) | Zeilenhöhe | Laufweite | Schreibung |
|---|---|---|---|---|---|---|
| Display XL (H1) | Geist | 700 | `clamp(56px, 7.1vw, 136px)` | 0.88 | −0.04em | Versalien |
| Display L (H2) | Geist | 700 | `clamp(40px, 5vw, 88px)` | 0.9 | −0.035em | Versalien |
| Display Worte (Haltung, Laufband) | Geist | 800 | `clamp(72px, 13vw, 220px)` | 0.85 | −0.05em | Versalien |
| Zahlen (Preise, Stats, LIVE) | Geist, `tabular-nums` | 600 | `clamp(36px, 3.6vw, 56px)` | 1 | −0.02em | |
| Lead | Geist | 400 | 19 px | 1.4 | −0.01em | |
| Text | Geist | 400 | 16–17 px | 1.6 | 0 | |
| UI, Nav, Buttons | Geist | 500 | 15 px | 1 | −0.005em | |
| Label (Eyebrow, Rundenmarke, LIVE) | Geist | 500 | 12 px | 1.3 | +0.02em | Versalien |

- Schlagnamen in Technik: Display L.
- Keine Kursivschrift, keine Verläufe in Schrift, kein Glühen.
- Laufweite und Gewicht der H1 in Phase 2 am Standbild nachmessen (Überlagerung Screenshot/Referenz) und nur bei sichtbarer Abweichung anpassen.

### B.4.3 Formen, Abstände, Licht

- **Radien:** Buttons 2 px, Karten und Videorahmen 6 px, Chips 999 px. Kantig und sportlich, keine runden Pillen-Buttons.
- **Raster:** 12 Spalten, Rinne `clamp(20px, 3.9vw, 56px)` außen, 24 px innen.
- **Abstände:** 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 160 px. Abschnitte im Fluss: 160 px vertikal (mobil 96 px).
- **Hairline:** 1 px `rgba(255,255,255,.14)`, für Vertrauenszeile, Zahlenreihen, Preise, Akkordeon.
- **Korn:** SVG-`feTurbulence`, 4 % Deckkraft, `mix-blend-mode: overlay`, fixiert, 8 fps Versatz. Gilt über allem außer Formularfeldern.
- **Hexagon-Motiv:** Die Hexagon-Leuchten aus dem Gym werden das grafische Zeichen der Seite. Dünne Linien (1 px, Weiß 24 %), nur in Runde 06, in der Lightbox-Ladeanzeige und im Favicon-Hintergrund. Sparsam.
- **Schatten:** keine, außer Modal `0 40px 120px -30px rgba(0,0,0,.6)`.

### B.4.4 Motion

- **Kurven:** Einblendungen `expo.out` (`cubic-bezier(.16,1,.3,1)`) 0.9–1.1 s · Transformationen `power3.inOut` · Hover 160 ms `ease-out`.
- **Zeilen-Reveal (Signatur aus der Vorschau):** Jede Headline-Zeile liegt in einer Maske. Sie fährt von `yPercent 105` auf `0`, Stagger 0.08. Unter der Zeile zieht sich eine 1-px-Linie von links auf (`scaleX 0 → 1`, 0.6 s) und blendet danach aus. Die Schrift startet bei 55 % Weiß und wird voll weiß.
- **Hover:** Buttons heben sich nicht, sie werden 6 % heller. Der Pfeil ↗ verschiebt sich um 2 px nach rechts oben. Magnetischer Sog nur auf den beiden Hero-Buttons (Radius 80 px, Stärke 0.25).
- **Nichts federt.** Keine Bounces, kein Wackeln, keine Partikel.

## B.5 Globale Bausteine

### B.5.1 Navigation (`Nav`)

- Höhe 72 px, Logo links (weiß, Höhe 28 px), rechts Links in Geist 500 15 px: Angebote · Über mich · Preise · Kontakt, dann der weiße Button „Jetzt buchen“ (klein, Höhe 40 px).
- Über dem Hero transparent. Nach 80 vh wird sie zur Glasleiste: `rgba(7,19,31,.55)`, Blur 16 px, unten Hairline. Wechsel über 200 ms, ohne Sprung.
- Anker springen per `lenis.scrollTo` (`#angebote` → Runde 03, `#about` → 05, `#preise` → 07, `#kontakt` → Kontakt). Die bestehenden IDs bleiben, damit alte Links funktionieren.
- **Rundenuhr** (Variante, Entscheidung in Phase 3): Zwischen Links und Button steht in Label-Schrift `RUNDE 03 · 1:12`. Die Zeit läuft mit dem Scrollfortschritt von 0:00 bis 3:00.
- Mobil: Logo, „Menü“, Button. Menü als Vollbild in `sl-night-950` mit Links in Display L.

### B.5.2 Cursor-Punkt (`CursorDot`)

- Wie in der Vorschau: Der normale Mauszeiger bleibt. Dazu folgt ein **Punkt von 12 px** mit Verzögerung (`lerp 0.18`).
- Weiß mit `mix-blend-mode: difference`. Auf blauem Himmel wirkt er pfirsichfarben, auf Orange hellblau, so wie in der Vorschau.
- Nur bei `pointer: fine`. Über Buttons und Links blendet er aus. Aus bei reduzierter Bewegung.

### B.5.3 Rundenmarke (`RoundMark`)

- Label-Schrift, z. B. `● RUNDE 02 — HALTUNG`. Der Punkt ist Signal-Orange.
- Im Hero und in fixierten Abschnitten unten links, sonst als Eyebrow über der H2.
- `aria-hidden`, die H2 trägt die Struktur.

### B.5.4 Buttons, Glas, Hairline-Reihe

- **Primär:** Weiß, Schrift `sl-night-950`, Geist 500 15 px, Höhe 56 px, Innenabstand 28 px, Radius 2 px, Icon ↗.
- **Sekundär:** Glas hell, Schrift weiß, Icon ⊙ bzw. Telefon.
- **Glaskarte:** Glas dunkel (B.4.1), Radius 6 px, Innenabstand 16–24 px.
- **Hairline-Reihe:** Linie über volle Spaltenbreite, darunter Einträge mit 14-px-Icon und Geist 500 13 px, Abstand 32 px.

### B.5.5 Video (`CinematicVideo`)

- Props: `src` (MP4, optional AV1), `poster` (AVIF), `posterBlur` (optional), `ratio`, `priority`.
- Erst das Poster. Das Video lädt, wenn der Abschnitt näher als 100 vh ist (`preload="none"` → `metadata`). Pausiert außerhalb des Viewports und bei verstecktem Tab.
- `muted playsInline loop`, `aria-hidden`. Bei `saveData` oder reduzierter Bewegung: nur Poster.
- **Fokus-Überblendung:** Statt `filter: blur()` auf Video liegt ein vorgerendertes, unscharfes Poster (`posterBlur`, 640 px) darüber und blendet aus. Das ist auf Safari deutlich günstiger.

### B.5.6 KI-Chip (`KiChip`)

- Kleiner Chip „KI-bearbeitet“ (Geist 500 11 px, Glas dunkel, Radius 999) in der unteren rechten Ecke jedes Mediums, das mit KI erzeugt oder erweitert wurde. Sichtbar beim ersten Kontakt, nicht nur bei Hover.
- Betroffen: Hero (Desktop und Mobil, V01m kommt aus Veo), Haltung, Coach (erweitert), Gym (erweitert), Dein Start, alle Detailbilder aus Phase 4. Nicht betroffen: echte Clips, die nur geschnitten und farbkorrigiert sind. V04 (kurz) und V07 sind echte, nur geschnittene Aufnahmen: kein Chip.
- Footer-Zeile: „Einzelne Bilder und Videos auf dieser Seite wurden mit KI-Unterstützung bearbeitet.“

### B.5.7 FocusField (WebGL, nur Hero)

Die Übersetzung von „MOVE TO FOCUS“ und „die Luft fängt sich und zieht nach“.

- Ein `<canvas>` über dem Hero-Video. OGL `Renderer` (`dpr` max. 1.5), Vollbild-Plane, `Texture` mit dem `<video>` als Quelle, Update pro Frame nur während das Video läuft.
- **Fokus:** Im Fragment-Shader Poisson-Unschärfe mit 12 Abtastpunkten. Radius `mix(0.0, uMaxBlur, smoothstep(uFocusR, uFocusR + uFeather, d))`, `d` = Abstand zum Fokuspunkt (seitenverhältnis-korrigiert). Start: `uMaxBlur 0.0065`, `uFocusR 0.16`, `uFeather 0.22`.
- **Zug:** OGL-`Flowmap` (`falloff 0.22`, `dissipation 0.965`). Die UV wird um `flow.xy * 0.03` verschoben, so zieht das Bild hinter der Maus nach.
- **Fokuspunkt:** folgt der Maus mit `lerp 0.08`. Nach 2,5 s ohne Bewegung wandert er zurück auf Salims Gesicht (`uRest`, in `content/media.ts` je Video als UV hinterlegt, in Phase 4 aus dem Bild gemessen) und atmet leicht.
- **Rückfall:** Das `<video>` liegt darunter im DOM. Das Canvas blendet erst ein, wenn das erste Bild gerendert ist. Ohne WebGL, auf Touch-Geräten und bei reduzierter Bewegung bleibt es beim Video.
- Rendern pausiert, wenn der Hero nicht sichtbar ist oder der Tab versteckt ist.

---

## B.6 Abschnitte

Texte aus `lib/constants.ts` und den Komponenten. **Fett** = Datei aus `assets/content/generated/` bzw. aufbereitet in `public/media/`.

### B.6.1 Runde 01 · Hero „Fokus“

- **Hintergrund:** **V01** Hero-Loop 16:9, Poster **B01**. Mobil **V01m** 9:16 (Veo aus B01m), Poster **B01m**. Fehlt V01m: Poster mit langsamem Zoom (B.7). FocusField darüber (Desktop).
- **Links, unten ausgerichtet** (wie in der Vorschau):
  - Eyebrow: `⊙ BEWEG DICH – DER FOKUS FOLGT` (Touch: `⊙ REUTLINGEN · BOXEN & FITNESS`)
  - H1 zweizeilig: `DEIN RING.` / `DEIN KAMPF.`
  - Lead (aus den vier Hero-Features): „Boxen & Fitness, Kraft & Ausdauer, Selbstvertrauen & Disziplin. Alle Level willkommen.“
  - Buttons: **Jetzt buchen ↗** (primär) · **Film ansehen ⊙** (Glas, öffnet die Reel-Lightbox)
  - Hairline-Reihe: `⊕ Wörthstrasse 17, Reutlingen` · `★ Probetraining kostenlos`
- **Rechts unten: LIVE-Karte** (`LiveCard`), 260 px, Glas dunkel:
  - Kopf: `((•)) LIVE IM GYM` und rechts ein Erweitern-Symbol (öffnet die Lightbox)
  - Mini-Video 16:10: Ausschnitt aus **V04** (kurzer Loop, Vogelperspektive)
  - Zeilen (Label links, Wert rechts in Zahlenschrift, Einheit gedämpft), berechnet aus dem Stundenplan in `content/site.ts` mit Zeitzone Europe/Berlin:

    | Situation | Zeile 1 | Zeile 2 | Zeile 3 |
    |---|---|---|---|
    | Kurs läuft | `Läuft gerade` · Kursname | `bis` · Uhrzeit | `Geöffnet` · bis 22:00 |
    | Geöffnet, Kurs heute später | `Nächster Kurs` · Kursname | `Beginn` · Uhrzeit | `Geöffnet` · bis 22:00 |
    | Geöffnet, kein Kurs mehr heute | `Nächster Kurs` · Tag + Kursname | `Beginn` · Uhrzeit | `Geöffnet` · bis 22:00 |
    | Geschlossen (22:00–10:00) | `Öffnet` · 10:00 | `Nächster Kurs` · Tag + Kursname | `Probetraining` · kostenlos |

  - Der Live-Punkt pulsiert in Signal-Orange nur, wenn gerade ein Kurs läuft.
  - Öffnungszeiten: **täglich 10:00–22:00**. Stundenplan wie in `components/sections/KurseInfos.tsx`: Mo/Mi/Fr Freies Training 17:00–19:00, Erwachsene 19:00–20:00 · Di/Do Kinder 17:00–18:00, Frauen 18:30–19:30.
- **Intro beim Laden:** Video `scale 1.06 → 1` (1.6 s), H1-Zeilen-Reveal (B.4.4), ab 0.5 s Lead, Buttons und Hairline-Reihe (`y 16 → 0`, Stagger 0.06), ab 0.9 s LIVE-Karte (`x 24 → 0`, Blur 8 → 0).
- **Herausscrollen:** H1 `yPercent 0 → −25`, Deckkraft → 0. Das Video schrumpft in einen Rahmen (`clip-path: inset(0) → inset(2vw round 6px)`) und dunkelt ab. LIVE-Karte blendet aus.
- KI-Chip unten rechts unter der LIVE-Karte.

**Drei Hero-Varianten für Stitch (Phase 3, Karahan wählt). Entschieden ist: Salim ist im Hero.**

1. **Weit (Empfehlung):** wie oben, **B01** mit Salim und dem Sportler in der rechten Hälfte, viel Himmel links.
2. **Eng:** **B01-eng** wurde nicht erzeugt, deshalb als Ausschnitt aus B01 (Zoom auf die rechte Hälfte, nur wenn die Auflösung reicht), beide groß im Bild, die Headline überlappt den Himmel über ihnen. Die Rundenuhr in der Nav ist eingeschaltet.
3. **Hochformat:** links die Headline auf `sl-night-950`, rechts ein hoher Rahmen (9:16) mit **V01m** (bzw. Poster B01m), darunter die LIVE-Karte. Wirkt nah und direkt, hat aber weniger Kino-Fläche.

### B.6.2 Runde 02 · Haltung (fixiert, 260 vh)

- **Hintergrund:** **V03** Nebel 16:9, Poster **B03a**, darüber das unscharfe Poster (Fokus-Überblendung).
- **Die drei Worte** (aus dem Footer-Motto), mittig links, Display Worte, untereinander:
  `MOTIVATION.` · `RESPEKT.` · `ERFOLG.`
- **Ablauf an den Scroll gebunden:**
  - 0–15 %: Worte als Kontur (1.5 px Weiß), Video unscharf.
  - 15–75 %: Je ein Wort füllt sich von links nach rechts (Uilora „Stroke Fill“, nachgebaut mit `background-clip: text` und einer Maske). Mit jedem Wort nimmt die Unschärfe ab.
  - 75–100 %: Alle drei Worte stehen gefüllt, darunter blendet die Zeile ein: „Disziplin, saubere Technik und der unverzichtbare Spaß an der Bewegung.“ (aus „Über mich“). Das Video ist scharf.
- Rundenmarke unten links, KI-Chip unten rechts.
- Übergang: Das Video dunkelt auf `sl-night-950`, der nächste Abschnitt beginnt auf voller Nacht.

### B.6.3 Runde 03 · Kurse (`#angebote`)

- H2 `KURSE`, darunter der Hinweis: „Bitte 15 Minuten vor Kursbeginn da sein, damit wir pünktlich starten können.“
- **Fünf Bahnen nebeneinander** (Uilora „Split Screen“-Akkordeon, nachgebaut), Höhe 78 svh. Zu ist eine Bahn 9 % breit mit senkrechter Beschriftung. Die aktive Bahn ist 46 % breit.
- Öffnen per Hover und Fokus (Desktop) bzw. Tippen. Die erste Bahn ist anfangs offen.
- Inhalt der offenen Bahn: Video 9:16 füllt die Bahn, unten eine Glaskarte mit Titel (Display L klein), Zeiten, Preis ab, drei Features aus `SERVICES` und „Probetraining buchen“.

| Bahn | Text (Quelle) | Medium | Vorauswahl im Formular |
|---|---|---|---|
| Erwachsenenkurse | MO, MI & FR · Kurs 19:00–20:00 · Freies Training 17:00–19:00 · ab 80 €/mtl. | echter Ausschnitt raw_03 Shadowboxing Wiese (13,6–17,9 s), LUT Nebel | Probetraining · Erwachsenenkurse |
| Frauenkurse | DI & DO · 18:30–19:30 (ohne eigenen Preis, wie heute) | personenfreies Detailbild aus Phase 4 (es gibt keine Fotos) | Probetraining · Erwachsenenkurse, Nachricht vorausgefüllt mit „Frauenkurs (DI & DO · 18:30–19:30)“. Das Formular selbst ändert sich dafür nicht. |
| Kinderkurse (3–14 Jahre) | DI & DO · 17:00–18:00 · ab 50 €/mtl. | personenfreies Detailbild aus Phase 4 (kleine Handschuhe auf dem Ring) | Probetraining · Kinderkurse |
| Boxtraining | Technik, Sparring & Fitness | **V04** | Probetraining · Erwachsenenkurse |
| Personal Training | Flexible Termine nach Absprache · 60 €/Std. · 1–4 Personen | **V07** Speedball | Probetraining · Personaltraining |

- Einstieg: Die Bahnen steigen gestaffelt von unten ein (`y 40 → 0`, Stagger 0.07).

### B.6.4 Runde 04 · Technik (fixiert, 220 vh)

- Links ein hoher Glasrahmen (9:16, Höhe 78 svh) mit **V04** (Vogelperspektive ohne Labels).
- Rechts H2 `BOXTRAINING` und Lead „Technik, Sparring & Fitness“, darunter die Schlagnamen in Display L untereinander: `JAB` · `HOOK` · `RIGHT SLIP` · `ROLL BACK` · `CROSS` · `UPPERCUT`.
- **Im Takt:** Das Video ist ein kurzer, sauberer Loop (3,3 s). Die Schlagnamen leuchten deshalb nicht synchron zum Original, sondern nacheinander im Takt: alle 0,8 s der nächste Name weiß mit Signal-Orange-Unterstrich, die anderen bei 25 % Weiß. Gesteuert über einen Timer, der pausiert, wenn der Abschnitt nicht sichtbar ist.
- **An den Scroll gebunden:** Die vier Säulen aus dem alten Hero (Boxen & Fitness · Kraft & Ausdauer · Selbstvertrauen & Disziplin · Alle Level willkommen) erscheinen nacheinander als Hairline-Reihe unter den Schlagnamen.
- Rundenmarke unten links.

### B.6.5 Runde 05 · Coach (`#about`)

- **B05** 21:9 vollflächig (mobil: das Original-Porträt im Ausschnitt 4:5, ohne KI). Beim Eintritt zieht der Fokus scharf (Fokus-Überblendung über 1.2 s).
- Eyebrow `ÜBER MICH`, H2 `SALIM LEE`.
- Glaskarte unten links (max. 520 px) mit den drei Absätzen aus „Über mich“ und der Zeile „Lass uns gemeinsam anpacken!“ als weißer Text mit Signal-Orange-Strich davor.
- **Zahlenreihe** (bestätigt): vier Spalten mit Hairline davor, Werte aus `STATS` in Zahlenschrift (5+ Jahre Erfahrung · 200+ Zufriedene Mitglieder · 15+ Wöchentliche Kurse · 100 % Engagement), zählen einmal hoch, wenn sichtbar.
- KI-Chip unten rechts (das Bild ist erweitert).

### B.6.6 Runde 06 · Das Gym

- **B06** 16:9 vollflächig mit Parallaxe (`yPercent −8 → 8`). Mobil: das Original `public/Boxring.jpeg` im Ausschnitt 4:5.
- H2 `DEIN RING.`, darunter in der Hairline-Reihe: `Wörthstrasse 17, 72764 Reutlingen` · Öffnungszeiten aus `CONTACT_INFO` (täglich 10:00–22:00) · „Bitte 15 Minuten vor Kursbeginn da sein.“
- Das Hexagon-Motiv: Über dem Bild zeichnen sich beim Eintritt drei Hexagon-Umrisse nach, deckungsgleich mit den Deckenleuchten (Positionen in Phase 4 aus B06 messen). 1 px Weiß 24 %, dann verblassen sie auf 10 %.
- KI-Chip.

### B.6.7 Runde 07 · Preise (`#preise`)

- H2 `UNSERE PREISE`, Lead „Transparente Preise ohne versteckte Kosten“.
- **Tabs** (Uilora „Tabs“ + „Dark Executive“ als Vorlage): Mitgliedschaft (Kurse) · Personaltraining · Probetraining. Die Service-Pauschale steht als Hinweiszeile unter allen Tabs.
- Zeilen in einer Glaskarte, getrennt durch Hairlines: Name (Geist 500 18 px), darunter die Badge (`Beste Ersparnis` in Signal-Orange, alle anderen wie `Flexibel`, `Einmalzahlung`, `Unverbindlich`, `Vorauszahlung` in Glas hell) und „zzgl. 30 € halbjährliche Service Pauschale“, rechts der Preis in Zahlenschrift, darunter `perUnit` als Chip, ganz rechts „Anfragen“.
- „Anfragen“ öffnet das Formular mit Anliegen „Mitgliedschaft anfragen“, Kurs und Mitgliedschaft vorausgewählt.
- Fußnote wie heute: „* Alle Preise inkl. MwSt. Kurszeiten: …“

### B.6.8 Runde 08 · Dein Start (fixiert, 160 vh) + Kontakt (`#kontakt`)

- **V08** 16:9 vollflächig, Poster **B08**. Mobil der echte Clip im Hochformat (B.7), Poster **B08m**.
- Große Zeile (Display XL, zweizeilig): `PROBETRAINING` / `KOSTENLOS.`, Zeilen-Reveal an den Scroll gebunden.
- Darunter: „Unverbindlich reinschnuppern (max. 2 Kurse).“ und „Jetzt starten – einfach vorbeikommen oder anrufen.“
- Buttons: **Jetzt buchen ↗** (Probetraining vorausgewählt) · **Anrufen** (Glas, `tel:+4915168457943`).
- Danach im Fluss **Kontakt & Standort:** vier Glaskarten (Adresse, Telefon, E-Mail, Öffnungszeiten) und rechts die Karte mit dem bestehenden Zustimmungs-Dialog. Der Text bleibt gleich, nur die Umlaute werden korrigiert (B.14).

### B.6.9 Footer

- Großes Laufband `TRAIN HARD · STAY STRONG ·` in Display Worte als Kontur. Die Laufrichtung folgt der Scrollrichtung, das Tempo der Lenis-Geschwindigkeit.
- Darunter: Logo, `MOTIVATION · RESPEKT · ERFOLG`, Social-Icons (Instagram, TikTok, YouTube, wie heute), Impressum, Datenschutz, Copyright, die KI-Zeile.

### B.6.10 Buchungsformular (`BookingDialog`)

- Optik: Glas dunkel auf abgedunkeltem Hintergrund, Radius 6, Felder mit Unterstrich statt Kasten, Fehler in `sl-signal-300`.
- Anliegen als zwei große Auswahlkarten (Probetraining · Mitgliedschaft anfragen), Kurs und Mitgliedschaft als Chips.
- **Logik 1:1:** `bookingSchema`, `COURSES`, `TRIAL_COURSES`, `MEMBERSHIP_OPTIONS`, der Aufbau des `service`-Strings und der `fetch('/api/booking')` mit identischem Body. Neu ist nur, dass Vorauswahlen von außen übergeben werden können (Anliegen, Kurs, Mitgliedschaft).
- Fokusfalle, ESC schließt, Lenis pausiert, solange es offen ist.
- **Test:** `components/site/booking/__tests__/payload.test.ts` prüft mit gemocktem `fetch`, dass der Body für alle Kombinationen gleich bleibt wie im alten `BookingModal`.

### B.6.11 Reel-Lightbox („Film ansehen“)

- Statt eines 16:9-Films ein **Hochkant-Player im Story-Stil**, weil das Material 9:16 ist: oben Fortschrittsbalken je Clip, Tippen links/rechts bzw. Pfeiltasten für zurück/weiter, ESC schließt.
- Clips (stumm, je 3–6 s): V01m (wenn vorhanden, mit KI-Chip) · V04 · V07 · raw_03 Box-Jump · raw_03 Seilspringen · raw_02 Weggehen (aufbereitet, B.11).
- Hintergrund: unscharfes Standbild des aktuellen Clips.

### B.6.12 Rechtsseiten und Zahlungsseiten

Neue Schriften und Farben, Glaskarte als Inhaltsfläche, Nav und Footer der Seite. Kein Text und keine Logik ändern sich.

---

## B.7 Mobil (< 768 px)

| Teil | Mobil |
|---|---|
| Hero | **V01m** 9:16, 100 svh. Fehlt V01m: Poster **B01m** mit langsamem Zoom `scale 1.00 → 1.06` über 12 s und feinem Korn (bei reduzierter Bewegung statisch). H1 `clamp(48px, 13vw, 64px)`. Buttons untereinander in voller Breite (wie die Stride-Mobilvorschau). LIVE-Karte unter der Hairline-Reihe, volle Breite. Kein FocusField, kein Cursor-Punkt. |
| Haltung | fixiert 170 vh, Worte `clamp(56px, 16vw, 88px)` |
| Kurse | waagerechtes Karussell mit Einrasten, Karten 80 vw im Format 9:16 |
| Technik | nicht fixiert: Video oben (9:16, 70 svh), darunter die Schlagnamen und die Säulen |
| Coach | Original-Porträt 4:5, Text darunter |
| Gym | Original `Boxring.jpeg` 4:5, Hexagone aus |
| Preise | Tabs als waagerechte Leiste, Zeilen gestapelt |
| Dein Start | echter Clip raw_03 Seilspringen (52,6–56,9 s, LUT Nebel) im Hochformat, Poster **B08m**. Fixierung aus. |

Getestet wird bei 375 × 812, 390 × 844, 768 × 1024, 1440 × 900 und 1920 × 1080.

## B.8 Barrierefreiheit und reduzierte Bewegung

- **`prefers-reduced-motion: reduce`:** kein Lenis, keine Fixierung, kein FocusField, kein Cursor-Punkt, Videos nur als Poster mit Play-Knopf, Einblendungen nur als Deckkraft ≤ 300 ms. Die Worte in Haltung stehen gefüllt.
- Genau eine `<h1>`, jede Runde eine sichtbare `<h2>`. Akkordeon mit `button` + `aria-expanded`, Tabs mit `role="tablist"`, Lightbox und Formular als `dialog` mit Fokusfalle.
- Skip-Link „Zum Inhalt springen“. Sichtbarer Fokus: 2 px Weiß mit 2 px Abstand.
- Kontrast: Fließtext ≥ 4,5 : 1, Display ≥ 3 : 1, auch über Video (Verläufe aus B.4.1).
- Videos `aria-hidden`. Bilder mit beschreibendem `alt` (z. B. „Coach Salim Lee hält die Pratzen, ein Sportler schlägt eine Gerade, Sportplatz in Reutlingen“).

## B.9 Performance

| Ziel | Wert |
|---|---|
| LCP mobil (4G) | < 2,5 s (LCP ist die H1 oder das Poster) |
| CLS / INP | < 0,05 / < 200 ms |
| Lighthouse | Mobil Performance ≥ 85 · Desktop ≥ 95 · A11y, SEO, Best Practices ≥ 95 |
| JS beim Start | < 180 KB gzip ohne OGL. OGL als eigener Chunk, geladen nach dem ersten Bild |
| Medien beim Start | mobil ≤ 2,5 MB (Poster ≤ 120 KB, Hero-Video startet nach dem LCP) |
| Bildrate | 60 fps Desktop (M1, Chrome und Safari), ≥ 50 fps iPhone 13 |

Im rAF-Loop keine Objekte anlegen. Alles pausiert außerhalb des Viewports und bei verstecktem Tab.

## B.10 SEO und Recht

- **Metadata:** Titel und Beschreibung bleiben. **Fehler:** `SITE_CONFIG.url` ist `https://salim-lee-gym.de`, live ist `https://www.salimlee-gym.de`. Korrektur in `lib/constants.ts` nur mit Freigabe (Phase 1).
- **OG-Bild** 1200 × 630 aus **B01** mit Logo (statisch, `public/og.jpg`).
- **JSON-LD** `SportsActivityLocation` mit Name, Adresse, Telefon, E-Mail, Öffnungszeiten, `sameAs` (Instagram, TikTok, YouTube) und `priceRange`.
- **`app/robots.ts` und `app/sitemap.ts`** neu: `/`, `/impressum`, `/datenschutz`. `/admin` und `/api` gesperrt.
- **Google Fonts (freigegeben, wird umgesetzt):** Heute lädt `globals.css` Barlow und Inter per `@import` live von Google, und `app/layout.tsx` baut per `preconnect` Verbindungen zu Google auf, auf jeder Seite. Das überträgt die IP der Besucher an Google (DSGVO-Risiko). Umsetzung nach Teil A, Ausnahmen 2 und 3: lokale Dateien, `@font-face`, Preconnects raus. Die Datenschutzerklärung erwähnt Google Fonts nicht, dort ändert sich nichts.
- **Öffnungszeiten (freigegeben):** `CONTACT_INFO.hours` wird „täglich 10:00–22:00“. Die Struktur `{ weekdays, weekend }` bleibt, z. B. `weekdays: 'Mo – So: 10:00 – 22:00'` und `weekend: ''`. Wo `weekend` leer ist, zeigt die Seite nur eine Zeile. JSON-LD: `openingHours: "Mo-Su 10:00-22:00"`.
- **KI-Kennzeichnung** nach B.5.6.
- Network-Tab der Preview prüfen: Es dürfen nur die eigene Domain bzw. Vercel vorkommen, Google Maps erst nach Klick.

## B.11 Medien: was wohin kommt

### B.11.1 Quellen und Ziele

Aufbereitung mit `scripts/cinematic/media.mjs` (ffmpeg, sharp). Ausgabe nach `public/media/` mit Inhalts-Hash im Namen. `content/media.ts` wird generiert.

| Quelle | Ziel | Kodierung |
|---|---|---|
| `generated/videos/gen_v01_hero-loop_16x9.mp4` | `media/hero/hero-16x9-1080.[hash].mp4` (+ `.av1.mp4`) | H.264 High, CRF 21, maxrate 6 M, 25 fps, GOP 2 s, ohne Ton, faststart · AV1 (SVT, CRF 34) |
| `generated/videos/gen_v01m_hero-loop_9x16.mp4` (Veo aus B01m, kann fehlen) | `media/hero/hero-9x16-720.[hash].mp4` | Farbe gegen B01m prüfen, LUT Sonne nur bei Abweichung, H.264 CRF 22. Fehlt die Datei: kein Video, Poster-Fallback (B.7), im Bericht melden |
| `generated/bilder/gen_b01…`, `gen_b01m…` | `media/hero/poster-16x9-{2560,1920,1280}.avif`, `poster-9x16-{1080,750}.avif` | AVIF q 55 |
| `gen_v03…` + `gen_b03a…` | `media/haltung/…mp4`, Poster + `poster-blur-640.avif` (Gauß 24 px) | wie Hero |
| `gen_v04_kombis-clean-kurz_9x16.mp4` (3,3 s, echte Aufnahme, nur „BOXIQ“ vom Boden entfernt) | `media/technik/kombis-9x16-720.mp4` + Mini-Ausschnitt 16:10 für die LIVE-Karte | nahtloser Loop per Überblendung der letzten 0,4 s, CRF 23 |
| `gen_v07_speedball-clean_4x5.mp4` | `media/kurse/personal-speedball-4x5.mp4` | Quelle ist 4:5 (720 × 896, Untertitel weggeschnitten). In Bahn und Karussell per `object-fit: cover`, `object-position: 50% 80%`. CRF 25, 4–6 s |
| `raw_03` 13,6–17,9 s | `media/kurse/erwachsene-shadowboxing-9x16.mp4` | Schnitt framegenau prüfen, LUT Nebel, 540 × 960 |
| `raw_03`, `raw_02`, `raw_06` (Zeitfenster aus `assets/content/README.md`) | `media/reel/*.mp4` | LUT passend, 720 × 1280, CRF 24 |
| `gen_v08…`, `gen_b08…`, `gen_b08m…` | `media/start/…` | wie Hero |
| `raw_03` 52,6–56,9 s | `media/start/start-9x16-720.[hash].mp4` (Mobil) | LUT Nebel, H.264 CRF 23, nahtloser Loop per Überblendung der letzten 0,4 s |
| `gen_b05…` + `reference/ref_salim_01…` | `media/coach/coach-21x9-*.avif`, `coach-4x5-*.avif` (aus dem Original) | AVIF q 60 |
| `gen_b06…` + `public/Boxring.jpeg` | `media/gym/gym-16x9-*.avif`, `gym-4x5-*.avif` | AVIF q 60 |
| `assets/logo.png` | `public/brand/logo-white-{280,560}.webp`, Favicon-Set | verlustfrei |

- Die Bilder aus Nano Banana liegen als `.jpg` vor. Das Skript sucht nach dem Dateinamen ohne Endung und nimmt `.jpg` oder `.png`.
- Jede Videoausgabe ohne Ton (`-an`). Der Ton von raw_03 ist ein geschützter Filmmonolog und darf nirgends auftauchen.
- Fehlt eine `generated`-Datei, nimmt das Skript den Ersatz aus der Spalte „Rückfall“ in `content/media.ts` (Poster aus dem Keyframe bzw. echter Clip) und meldet es.
- Am Ende eine Tabelle: Datei, Maße, Länge, Größe.
- Cache: in `next.config.js` per `headers()` für `/media/*` und `/brand/*` `Cache-Control: public, max-age=31536000, immutable`. `vercel.json` bleibt unberührt.

### B.11.2 Ein Look für echte und generierte Clips (LUT)

- **LUT Sonne:** aus dem Paar `keyframes/kf_01b…` (Original) → `generated/bilder/gen_b01m…` (gleicher Ausschnitt, freigegebene Farbe).
- **LUT Nebel:** aus `keyframes/kf_03e…` → `generated/bilder/gen_b08m…`.
- `scripts/cinematic/lut.py`: beide Bilder auf 540 px verkleinern, Pixel mit großer Strukturabweichung (entfernter Text) ausschließen, eine 33³-LUT per Polynom 2. Grades (Least Squares) anpassen, als `.cube` speichern. Mit `ffmpeg -vf lut3d` auf die echten Clips anwenden.
- Kontrolle: Keyframe mit LUT neben B01m bzw. B08m legen. Die mittlere Abweichung in Lab-Werten soll unter 3 liegen. Wenn nicht: Rückfall auf eine von Hand abgestimmte ffmpeg-Kette und im Bericht melden.

### B.11.3 Personenfreie Detailbilder (Nano-Banana-MCP, Phase 4)

Nur diese drei, mit **B01** als Eingabebild für Licht und Farbe (Leitbild-Prinzip aus der Anleitung):

| Datei | Motiv | Format |
|---|---|---|
| `detail-kinder-handschuhe` | ein Paar kleine rot-schwarze Kinder-Boxhandschuhe auf der schwarzen Ringkante, Hexagon-Licht unscharf im Hintergrund | 9:16 |
| `detail-frauen-bandagen` | Bandagen und ein Paar Handschuhe auf einer Holzbank, weiches Fensterlicht, kobaltblaue Dämmerung draußen | 9:16 (für die Frauenkurs-Bahn, es gibt keine Fotos) |
| `detail-preise-hintergrund` | Ringseile im Gegenlicht, extrem unscharf, Kobalt und ein Hauch Orange | 21:9 |

Negativ-Prompt bei allen: keine Personen, keine Hände, keine Stockfoto-Optik, kein Text im Bild, keine Logos, keine Wasserzeichen.

## B.12 Uilora → unsere Bausteine

**Kein MCP, kein Paket.** Die Seiten unten im Browser öffnen (Basis `https://www.uilora.com/get-started/web/components/`, an jede Komponente `?full=true` anhängen für die Vollbild-Vorschau). Verhalten, Timing und Aufbau ansehen, dann in unseren Tokens nachbauen. Wenn der Code auf der Seite frei einsehbar ist (`?view=code`), darf er als Vorlage dienen. Gesperrten Code nicht umgehen. Keine Uilora-Farben, -Radien oder -Schriften übernehmen.

| Unser Baustein | Uilora-Vorlage (Pfad ab Basis) | Anpassung |
|---|---|---|
| Nav (Glasleiste) | `navigations-structure/navbars/apple-glass-nav` | Höhe 72, Glas dunkel, Radius 0 |
| FocusField: Zug | `crazy-components/grid-distortion` · `animations-motion/parallax-scroll/velocity-smear` | Prinzip Zug/Verschmieren, umgesetzt mit OGL-Flowmap (B.5.7) |
| FocusField: Fokus, Coach-Fokus | `animations-motion/scroll-reveals/focal-shift-reveal` | Fokus-Wechsel, bei uns Shader bzw. Fokus-Überblendung |
| Hero → Haltung | `animations-motion/scroll-reveals/cinematic-scroll` | Video schrumpft in den Rahmen (B.6.1) |
| Hero-Buttons | `ui-components/buttons` · `animations-motion/text-animations/magnetic-hover` | magnetisch nur im Hero, Radius 2 |
| Zeilen-Reveal | `animations-motion/text-animations/masked-reveal` | Maske + Hairline (B.4.4) |
| Haltung-Worte | `animations-motion/text-animations/stroke-fill` | an den Scroll gebunden |
| Kurse (Desktop) | `special-elements/accordions/split` | Video-Bahnen, senkrechte Beschriftung |
| Kurse (Mobil) | `special-elements/carousels/focus-card` | Karten 80 vw, Einrasten |
| Technik-Säulen, Zahlenreihe | `content-blocks/stats-sections/stats-minimal` · `stats-editorial` | Hairline-Spalten, einmal hochzählen |
| Gym | `animations-motion/parallax-scroll/scroll-zoom` | nur `yPercent ±8` und leichter Zoom |
| Preise | `content-blocks/pricing/pricing-dark-premium` · `pricing-glass` · `special-elements/tabs/glassa` · `special-elements/badges/status-badges` | Glas statt Verlauf, Zahlenschrift |
| LIVE-Karte | `ui-components/cards/card-cinematic` · `uilora-overlay-card` | 260 px, Glas dunkel |
| Reel-Lightbox | `media/light-boxes/lightbox-story` · `lightbox-reel` · `media/video-players/player-cinema` | Story-Fortschritt, 9:16 |
| Formular | `ui-components/forms/glass-form` · `ui-components/modals-design/void-modal` | Unterstrich-Felder, Glas, Radius 6 |
| Korn | `backgrounds-visuals/noise-texture/uilora-ink-grain` | 4 %, fixiert |
| Laufband Footer | `animations-motion/text-animations/velocity-scroll` | Tempo und Richtung aus Lenis |
| Footer | `navigations-structure/footers/curtain-footer` | Footer schiebt sich unter dem letzten Abschnitt hervor |

## B.13 Bau-Reihenfolge und Abnahme

Nach jedem Schritt:

- `npm run lint` und `npm run build` grün, `npx tsc --noEmit` ohne Fehler
- `/admin/login` lädt unverändert (Screenshot-Vergleich vorher/nachher)
- Playwright-Screenshots bei 1440 × 900 und 390 × 844 nach `docs/qa/<schritt>/`
- Commit auf `feat/cinematic-landing` und Push, die Vercel-Preview ist aktuell

**Schritte**

1. **Grundlagen:** Route Group `(site)`, `site.css`, Tokens `sl` (B.4), Lenis + GSAP, Korn, Cursor-Punkt, Skip-Link, `content/site.ts`, leere Abschnitte mit allen IDs. **Schriften lokal:** Geist nach `app/(site)/fonts/`, Barlow und Inter nach `public/fonts/`, `@import` in `globals.css` durch `@font-face` ersetzen, Preconnects in `app/layout.tsx` entfernen, `CONTACT_INFO.hours` anpassen (Teil A, Ausnahmen). Danach `/admin/login` mit dem Vorher-Screenshot vergleichen: gleiche Schrift, gleiches Bild.
2. **Medien:** `media.mjs`, `lut.py`, Detailbilder (B.11), `content/media.ts`, `CinematicVideo`.
3. **Nav + Hero** in der gewählten Variante, mit LIVE-Karte und FocusField.
4. **Haltung.**
5. **Kurse + Technik.**
6. **Coach + Gym.**
7. **Preise, Dein Start, Kontakt, Footer.**
8. **Buchungsformular** mit Payload-Test, **Reel-Lightbox.**
9. **Rechts- und Zahlungsseiten.**
10. **Mobil, reduzierte Bewegung, A11y** (B.7, B.8).
11. **Performance, SEO** (B.9, B.10), Lighthouse-Bericht nach `docs/qa/lighthouse/`.
12. **Aufräumen:** alte Landing-Komponenten entfernen (nach `grep`), `README.md` um die neuen Skripte ergänzen.

**Definition of Done**

- [ ] Admin, API, Stripe- und Supabase-Code unverändert (`git diff main --stat` zeigt nichts unter `app/admin`, `app/api`, `components/admin`, `supabase`; unter `lib/` nur `CONTACT_INFO.hours`; außerhalb von `(site)` nur die freigegebenen Zeilen in `globals.css` und `app/layout.tsx`).
- [ ] Network-Tab auf `/`, `/impressum`, `/datenschutz` und `/admin/login`: keine Anfrage an `fonts.googleapis.com` oder `fonts.gstatic.com`.
- [ ] Der Request an `/api/booking` ist für alle Kombinationen identisch zu vorher (Test grün). Keine Buchung wurde abgeschickt.
- [ ] Alle Texte stammen aus `lib/constants.ts` und den alten Komponenten. Neu ist nur, was in B.14 steht und freigegeben wurde.
- [ ] Salim ist nur in Medien aus `generated/` oder echten Clips zu sehen. Jedes KI-Medium trägt den Chip.
- [ ] Hero, Haltung, Technik und Dein Start sind als Standbild präsentabel (QA-Screenshots).
- [ ] FocusField: 60 fps auf M1, sauberer Rückfall ohne WebGL.
- [ ] Reduzierte Bewegung, Mobil und Tastatur getestet. Keine Konsolenfehler, keine Hydration-Warnungen.
- [ ] Lighthouse-Ziele erreicht. Network-Tab ohne Drittanbieter (Maps erst nach Klick).
- [ ] Keine Rohvideos und keine 4K-Generierungen im Git.
- [ ] Auf `main` wurde nichts gepusht.

## B.14 Neue Zeilen (Freigabe in Phase 1)

| Stelle | Text |
|---|---|
| Hero-Eyebrow Desktop | `⊙ BEWEG DICH – DER FOKUS FOLGT` |
| Hero-Eyebrow Touch | `⊙ REUTLINGEN · BOXEN & FITNESS` |
| Hero-Lead | „Boxen & Fitness, Kraft & Ausdauer, Selbstvertrauen & Disziplin. Alle Level willkommen.“ (die vier alten Features als Satz) |
| Hero-Button 2 | „Film ansehen“ |
| LIVE-Karte | `LIVE IM GYM` · „Läuft gerade“ · „Nächster Kurs“ · „Beginn“ · „bis“ · „Geöffnet“ · „bis 22:00“ · „Öffnet“ · „Probetraining“ · „kostenlos“ |
| Frauenkurs-Vorbefüllung | Nachricht im Formular: „Frauenkurs (DI & DO · 18:30–19:30)“ |
| Rundenmarken | `RUNDE 01 — FOKUS` · `02 — HALTUNG` · `03 — KURSE` · `04 — TECHNIK` · `05 — COACH` · `06 — DAS GYM` · `07 — PREISE` · `08 — DEIN START` |
| Technik-Schlagnamen | `JAB` · `HOOK` · `RIGHT SLIP` · `ROLL BACK` · `CROSS` · `UPPERCUT` (wie im Video) |
| Gym-Headline | `DEIN RING.` |
| Kurs-Button | „Probetraining buchen“ |
| Preis-Button | „Anfragen“ |
| Start-Button 2 | „Anrufen“ |
| KI-Chip | „KI-bearbeitet“ |
| KI-Zeile Footer | „Einzelne Bilder und Videos auf dieser Seite wurden mit KI-Unterstützung bearbeitet.“ |
| Skip-Link | „Zum Inhalt springen“ |
| Rechtschreibung Karten-Hinweis | „uebermittelt“ → „übermittelt“, „Datenschutzerklaerung“ → „Datenschutzerklärung“ |

## B.15 Entscheidungen und offene Punkte

**Entschieden (Karahan, 26.10.2026)**

| Thema | Antwort |
|---|---|
| Hero | mit Coach Salim |
| Einwilligungen | liegen vor, Videos frei nutzbar |
| Frauenkurse | keine Fotos → personenfreies Detailbild |
| Zahlen und Preise | stimmen |
| Öffnungszeiten | täglich 10:00–22:00 |
| Schrift | wie in der Vorschau → Geist, lokal |
| Google Fonts | nie, überall lokal (auch Admin) |
| „BOXIQ“ | kein Programmname, kommt nicht auf die Seite |
| Uilora | kein MCP, nur ansehen und nachbauen |

**Noch offen (in Phase 1 klären)**

1. **Domain:** `SITE_CONFIG.url` steht auf `https://salim-lee-gym.de`, live ist `https://www.salimlee-gym.de`. Korrigieren? (Betrifft OG-Links und Metadaten.)
2. **Kurse bis 22 Uhr:** Gibt es Kurse nach 20:00, die noch nicht auf der Seite stehen? Wenn ja, mit Tag und Uhrzeit in den Stundenplan aufnehmen (die LIVE-Karte rechnet damit).
3. **Frauenkurs im Formular:** Reicht die Vorbefüllung der Nachricht, oder soll er eine eigene Auswahl im Formular bekommen? Eine eigene Auswahl ändert den `service`-Text, den der Admin sieht, und braucht Freigabe.
4. **Bewertungen:** Echte Google-Bewertungen mit Link zeigen? Nur mit Quelle, nichts erfinden. Ohne Antwort: keine.

---

# TEIL C — Der Prompt (komplett kopieren)

Von „Du baust mit mir …“ bis zur letzten Zeile von Phase 7 am Stück in Claude Code einfügen.

```text
Du baust mit mir das Cinematic Redesign der öffentlichen Seite von Salim Lee
Boxing & Fitness Gym (www.salimlee-gym.de). Grundlage ist docs/CINEMATIC.md
im Repo. Lies die Datei komplett, bevor du etwas tust. Teil A (Entscheidungen)
und Teil B (Spezifikation) sind verbindlich. Arbeite die Phasen der Reihe
nach ab und halte an den markierten Stellen an, bis ich geantwortet habe.
Überspring nichts.

Feste Regeln für die ganze Arbeit:
- Gearbeitet wird nur auf dem Branch feat/cinematic-landing. Du darfst dort
  committen und pushen. Die Identität kommt aus git config, ohne
  Co-Authored-By und ohne KI-Hinweis. Niemals auf main pushen, nichts mergen,
  nicht force-pushen, nicht rebasen. Einen PR öffnest du nur, wenn ich es
  ausdrücklich sage.
- Nicht anfassen: app/admin, app/api, components/admin, bestehende Dateien
  in lib/, supabase/, scripts/*.mjs, types/database.types.ts, die Crons in
  vercel.json, die DESIGN.md im Root. Ausnahmen sind nur die drei
  freigegebenen Stellen aus Teil A (Öffnungszeiten in lib/constants.ts,
  lokale Schriften in app/globals.css, Preconnects in app/layout.tsx).
- Schriften nur als lokale Dateien im Repo. Nie Google Fonts, auch nicht
  über next/font/google, kein CDN.
- Keine Secrets, Keys, Tokens oder .env-Dateien lesen, ausgeben oder
  committen. Wenn ein MCP einen Key braucht, nenne ich dir den Pfad zur
  Datei.
- Keine Buchung absenden, weder lokal gegen die echte Datenbank noch in der
  Preview oder live. Das Formular testest du nur bis vor den Absende-Klick
  und per Test mit gemocktem fetch.
- Die Texte kommen aus lib/constants.ts und components/sections/. Neu ist
  nur, was in B.14 steht und ich freigegeben habe. Keine erfundenen Zahlen,
  Bewertungen oder Zitate.
- Generier keine Bilder oder Videos von Salim oder anderen echten Menschen.
  Salim kommt nur aus assets/content/generated/ und assets/content/raw/.
  Der Nano-Banana-MCP darf nur die personenfreien Detailbilder aus B.11.3
  erzeugen.
- Stride Nine (getlayers.ai) ist ein gesperrtes Premium-Template. Versuch
  nicht, Code, Prompt oder Dateien davon zu bekommen. Nur die sichtbare
  Designsprache zählt.
- Prüf nach jeder Änderung das Design selbst gegen docs/DESIGN-CINEMATIC.md,
  bevor du mir das Ergebnis zeigst.

PHASE 0 — SETUP
Prüf, welche Skills und MCPs aktiv sind, und sag es mir in einer Liste.
Gebraucht werden die Skills frontend-design (Anthropic), taste-skill
(Leonxlnx) und ui-ux-pro-max (nextlevelbuilder) sowie die MCPs Google
Stitch, Nano Banana und Vercel. Für Uilora gibt es keinen MCP, du siehst
dir die Seiten später im Browser an. Fehlt etwas, sag mir, was, und
richte es nach meiner Antwort ein.
Prüf mit dem Vercel-MCP, ob du das Projekt dieser Seite sehen kannst. Leg
kein neues Projekt an. Wenn du keinen Zugriff hast, sag es mir, dann holen
wir die Preview-URL aus GitHub.
Dann: main aktualisieren, Branch feat/cinematic-landing anlegen. In die
.gitignore kommen: assets/content/raw/, assets/content/keyframes/,
assets/content/reference/, assets/content/omni-input/,
assets/content/generated/ und docs/referenz/. Erster Commit:
docs/CINEMATIC.md, docs/CONTENT-PRODUKTION.md, assets/content/README.md und
die .gitignore. Push, und nenn mir die Preview-URL des Branches.
Mach einen Screenshot von /admin/login als Vergleich für später
(docs/qa/00-admin-vorher.png).
Im taste-skill stellst du ein: Layout-Mut 8, Bewegung 7 für Hero und die
fixierten Runden und 3 für die Abschnitte im Fluss, Informationsdichte 3.

PHASE 1 — INHALT
Bau noch nichts. Lies lib/constants.ts und alle Dateien in
components/sections/. Schreib docs/CINEMATIC-BRIEF.md mit
(1) einer Tabelle: jeder vorhandene Text → Runde bzw. Abschnitt aus B.6,
(2) allen neuen Zeilen aus B.14,
(3) den noch offenen Punkten aus B.15 (Domain, Kurse bis 22 Uhr,
    Frauenkurs im Formular, Bewertungen),
(4) einer Liste, welche Dateien in assets/content/generated/ fehlen.
>>> STOPP: Zeig mir die Tabelle, die neuen Zeilen, die Fragen und die
fehlenden Dateien. Warte auf meine Antworten und trag sie in
docs/CINEMATIC-BRIEF.md ein.

PHASE 2 — DESIGNRICHTUNG
Design-Referenz: https://www.getlayers.ai/templates?layer=stride-nine
Dazu meine Bildschirmaufnahme der Vorschau:
docs/referenz/stride-nine-aufnahme.mp4.
Schneide aus dem Video Standbilder (ffmpeg, 4 pro Sekunde) und ruf die
Referenzseite auf. Öffentlich sichtbar ist nur der Hero. Lies daraus die
Designsprache aus: Typo-Skala und Gewichte, Farben mit Hex-Werten (miss
nach, vergleiche mit B.4.1), Abstände, Radien, Glas, Buttons, die
LIVE-Karte, den Zeilen-Reveal mit den Linien, den Cursor-Punkt und das
Verhalten von Fokus und Zug unter der Maus. Keine Inhaltsbeschreibung.
Die Schrift ist Geist (B.4.2). Prüf das mit einer Überlagerung: Setz die
H1 der Vorschau in Geist nach und leg sie über das Standbild. Miss dabei
Gewicht, Laufweite und Zeilenabstand nach.
Führ das mit Teil B zusammen. Bei Widersprüchen gilt Teil B, außer deine
Messung zeigt eine klare Abweichung bei Farben oder Schrift. Dann sag es
mir.
Schreib das als docs/DESIGN-CINEMATIC.md im Format, das Stitch als
Design-System einlesen kann. Die DESIGN.md im Root gehört zum Admin, lass
sie unverändert. Leg in Stitch ein Projekt „Salim Lee Cinematic“ an, lade
die Datei hoch, bau daraus das Design-System und nenn mir die ID.

PHASE 3 — SCREENS
Generier in Stitch die Screens, Device-Type DESKTOP, immer mit unserer
Design-System-ID: Hero, Haltung (bei 75 %), Kurse (erste Bahn offen),
Technik, Coach, Preise, Dein Start mit Kontakt, dazu der Hero als MOBILE.
Inhalte aus docs/CINEMATIC-BRIEF.md, keine Platzhaltertexte. Als Bilder
nimmst du die Poster aus assets/content/generated/bilder/. Nimmt Stitch
keine eigenen Bilder an, bleibt die Fläche neutral mit dem Dateinamen, die
Bilder kommen in Phase 5 hinein.
Vom Hero baust du die drei Varianten aus B.6.1. Salim ist in allen dreien.
>>> STOPP: Zeig mir die drei Hero-Varianten mit je einem Satz Unterschied
und warte auf meine Wahl. Frag mich dabei auch, ob die Rundenuhr in die
Nav kommt.
Danach wendest du das Design-System auf alle Screens an und lädst das
Projekt als Assets nach docs/stitch/ herunter.

PHASE 4 — MEDIEN
Bereite die Medien nach B.11 auf: scripts/cinematic/media.mjs und
scripts/cinematic/lut.py. Prüf die
Zeitfenster für echte Clips framegenau (kein Rest von Untertiteln). Miss
die Fokus-Ruhepunkte (Salims Gesicht) und die Hexagon-Positionen in B06.
Erzeuge mit dem Nano-Banana-MCP nur die drei personenfreien Detailbilder
aus B.11.3, mit B01 als Eingabebild, in 4K, mit dem Negativ-Prompt.
Gib mir danach eine Tabelle: Datei, Maße, Länge, Größe, Quelle, und die
LUT-Abweichung (Lab) für Sonne und Nebel. Melde jede fehlende Quelle und
welchen Rückfall du genommen hast.

PHASE 5 — BAUEN
Bau die Seite in diesem Repo nach Teil B, in der Reihenfolge aus B.13.
Grundlage: die Texte aus docs/CINEMATIC-BRIEF.md, die Stitch-Screens als
visuelle Vorlage, die Medien aus Phase 4. Für die Bausteine aus B.12 öffnest
du die verlinkten Uilora-Seiten im Browser (mit ?full=true), siehst dir
Verhalten und Timing an und baust sie in unseren Tokens nach. Kein
Uilora-MCP, kein Uilora-Paket, gesperrten Code nicht umgehen.
Der Stitch-Export ist eine Vorlage, kein Endprodukt. Bau sauber nach:
eigene Komponenten, echtes responsives Layout, die Bewegung exakt nach
B.4.4, B.5 und B.6. Übernimm nicht das exportierte Markup eins zu eins.
Nutz dabei die installierten Design-Skills.
Nach jedem Schritt aus B.13: Checks grün, /admin/login unverändert,
QA-Screenshots, Commit, Push.
Wenn alles steht, gib mir die Preview-URL und einen Bericht: was gebaut
ist, was abweicht und warum, Lighthouse-Werte, offene Punkte.
>>> STOPP: Warte auf mein Feedback.

PHASE 6 — POLIEREN
Arbeite mein Feedback ein. Geh danach mit dem Skill ui-ux-pro-max über die
Seite und polier Typografie, Abstände, Kontraste und die Zustände von
Buttons, Links, Tabs, Akkordeon und Formular. Prüf die Definition of Done
aus B.13 Punkt für Punkt und hak sie im Bericht ab. Push, neue Preview-URL.
>>> STOPP: Frag mich, ob es nach main geht.

PHASE 7 — LIVE
Du mergst nicht selbst. Wenn ich „Go“ sage, schreibst du mir den Text für
den PR feat/cinematic-landing → main (Zusammenfassung, Screenshots,
Checkliste, Hinweis auf die KI-Kennzeichnung). Ich öffne und merge den PR.
Danach prüfst du das Production-Deployment von www.salimlee-gym.de: über
den Vercel-MCP Build-Status und Laufzeitfehler (falls du Zugriff hast),
dann ein Durchlauf durch alle Runden auf Desktop und Mobil, /impressum,
/datenschutz und /admin/login (lädt, unverändert). Keine Buchung absenden.
Gib mir die Live-URL und das Ergebnis.
```

---

## Feedback, das ankommt (für Phase 5 und 6)

Wie in der Anleitung: Stelle, Ist, Soll, Screenshot.

```text
Runde 04 Technik, Screenshot im Anhang, bei ~40 % der Fixierung:
- „ROLL BACK“ leuchtet ca. 0,3 s zu spät auf. Zeitmarke vorziehen.
- Abstand zwischen Video-Rahmen und Schlagnamen kleiner als im Hero zwischen
  H1 und Lead. Gleichen Wert nehmen.
- Die Säulen erscheinen zu früh. Erst ab 50 % der Fixierung starten.
```
