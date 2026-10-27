---
version: alpha
name: Salim Lee Cinematic
description: A cinematic sports-campaign redesign for a Reutlingen boxing & fitness gym — a deep night-to-cobalt sky as the surface, unbroken white uppercase Geist headlines set across full-bleed footage of the coach at the pads, a single restrained signal-orange accent, dark glass cards, and motion that only ever means focus, rhythm or a punch. Night, not neon.

colors:
  # ─ Surface (night & cobalt) ─
  night-950: "#07131F" # canvas / deepest sky, section fill
  night-900: "#0E273D" # upper sky, raised surface
  night-800: "#132E48" # surface-2
  cobalt-600: "#224565" # sky middle
  cobalt-400: "#436886" # horizon
  # ─ Text (mist) ─
  mist-50: "#FFFFFF" # ink / headlines on dark
  mist-100: "#F2F5F8"
  mist-200: "#D5DEE7" # body
  mist-400: "#A9B8C6" # muted
  mist-600: "#74879A" # faint / units
  # ─ Accent (signal orange, ≤5% of any view) ─
  signal-300: "#F28A55"
  signal-500: "#E0622C" # the accent
  signal-600: "#B8461C"
  # ─ Semantic aliases ─
  canvas: "#07131F"
  surface: "#0E273D"
  ink: "#FFFFFF"
  body: "#D5DEE7"
  mute: "#A9B8C6"
  hairline: "#2B3C4B" # opaque fallback for rgba(255,255,255,.14) on night
  accent: "#E0622C"
  on-accent: "#07131F"
  on-primary: "#07131F" # dark text on the white primary button

typography:
  # One family for everything: Geist (variable 100–900, local woff2). No italics.
  display-xl: # H1 — hero headline, uppercase
    fontFamily: Geist, system-ui, -apple-system, Segoe UI, Roboto, sans-serif
    fontSize: 96px
    fontWeight: 700
    lineHeight: 91px # ≈0.95
    letterSpacing: -1.9px
  display-lg: # H2 — section / punch names, uppercase
    fontFamily: Geist, system-ui, -apple-system, Segoe UI, Roboto, sans-serif
    fontSize: 64px
    fontWeight: 700
    lineHeight: 58px # ≈0.9
    letterSpacing: -2.2px
  display-words: # Haltung words, footer marquee — uppercase
    fontFamily: Geist, system-ui, -apple-system, sans-serif
    fontSize: 180px
    fontWeight: 800
    lineHeight: 153px # ≈0.85
    letterSpacing: -9px
  numeric: # prices, stats, LIVE values — tabular
    fontFamily: Geist, system-ui, -apple-system, sans-serif
    fontSize: 48px
    fontWeight: 600
    lineHeight: 48px
    letterSpacing: -1px
  lead:
    fontFamily: Geist, system-ui, -apple-system, sans-serif
    fontSize: 19px
    fontWeight: 400
    lineHeight: 27px
    letterSpacing: -0.19px
  body:
    fontFamily: Geist, system-ui, -apple-system, sans-serif
    fontSize: 17px
    fontWeight: 400
    lineHeight: 27px
  ui: # nav, buttons
    fontFamily: Geist, system-ui, -apple-system, sans-serif
    fontSize: 15px
    fontWeight: 500
    lineHeight: 15px
    letterSpacing: -0.075px
  label: # eyebrow, round-mark, LIVE label — uppercase
    fontFamily: Geist, system-ui, -apple-system, sans-serif
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0.24px

rounded:
  none: 0px
  button: 2px
  card: 6px
  pill: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  4xl: 96px
  section: 160px

components:
  nav-bar: # transparent over hero → dark glass after 80vh
    backgroundColor: "{colors.night-950}" # render as rgba(7,19,31,.55) + blur 16px in build
    textColor: "{colors.ink}"
    typography: "{typography.ui}"
    padding: "{spacing.md} {spacing.lg}"
  nav-link:
    textColor: "{colors.body}"
    typography: "{typography.ui}"
  round-mark: # ● RUNDE 02 — HALTUNG
    textColor: "{colors.mute}"
    dotColor: "{colors.accent}"
    typography: "{typography.label}"
  button-primary: # WHITE with dark text — not orange
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-primary}"
    typography: "{typography.ui}"
    rounded: "{rounded.button}"
    padding: "{spacing.md} {spacing.lg}"
  button-glass: # secondary — light glass, white text
    backgroundColor: "{colors.night-900}" # render rgba(255,255,255,.14) + blur 12px
    textColor: "{colors.ink}"
    typography: "{typography.ui}"
    rounded: "{rounded.button}"
    padding: "{spacing.md} {spacing.lg}"
  glass-card: # dark glass — the card surface everywhere
    backgroundColor: "{colors.night-900}" # render rgba(7,19,31,.45) + blur 18px + 1px rgba(255,255,255,.10)
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    rounded: "{rounded.card}"
    padding: "{spacing.lg}"
  live-card: # 260px, dark glass, mini-video + value rows
    backgroundColor: "{colors.night-900}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    labelColor: "{colors.mute}"
    valueTypography: "{typography.numeric}"
    liveDotColor: "{colors.accent}"
    rounded: "{rounded.card}"
    padding: "{spacing.md}"
  hairline-row: # trust row / gym facts — 1px line + icon items
    borderColor: "{colors.hairline}"
    textColor: "{colors.body}"
    typography: "{typography.ui}"
  price-row:
    backgroundColor: "{colors.night-900}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    priceTypography: "{typography.numeric}"
    rounded: "{rounded.card}"
    padding: "{spacing.lg}"
  tab:
    textColor: "{colors.mute}"
    activeTextColor: "{colors.ink}"
    activeUnderline: "{colors.accent}"
    typography: "{typography.ui}"
  badge-signal: # "Beste Ersparnis" — the only orange badge
    backgroundColor: "{colors.signal-500}"
    textColor: "{colors.night-950}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "{spacing.xxs} {spacing.sm}"
  badge-glass: # Flexibel / Einmalzahlung / Unverbindlich / Vorauszahlung
    backgroundColor: "{colors.night-800}"
    textColor: "{colors.body}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "{spacing.xxs} {spacing.sm}"
  ki-chip: # "KI-bearbeitet" bottom-right of AI media
    backgroundColor: "{colors.night-900}"
    textColor: "{colors.mist-200}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "{spacing.xxs} {spacing.sm}"
  booking-field: # underline inputs, not boxes
    backgroundColor: "{colors.night-950}"
    textColor: "{colors.ink}"
    underlineColor: "{colors.hairline}"
    errorColor: "{colors.signal-300}"
    typography: "{typography.body}"
  course-lane: # Kurse split-screen lane
    backgroundColor: "{colors.night-900}"
    textColor: "{colors.ink}"
    labelColor: "{colors.mist-200}"
    rounded: "{rounded.card}"
  footer:
    backgroundColor: "{colors.night-950}"
    textColor: "{colors.body}"
    typography: "{typography.body}"
    marqueeTypography: "{typography.display-words}"
    padding: "{spacing.3xl} {spacing.lg}"
---

## Overview

Salim Lee Boxing & Fitness is a Reutlingen gym, and the cinematic site wears that like a sports campaign. The surface is a **deep night-to-cobalt sky** (`{colors.night-950}` `#07131F` → `{colors.cobalt-400}` `#436886`) that runs edge-to-edge behind full-bleed footage of the coach at the pads. Headlines are **unbroken white uppercase Geist** set large and tight across the image. A single **signal-orange** (`{colors.accent}` `#E0622C`) is the only warm note in the interface — reserved for the live dot, one savings badge, the active punch name and the active tab underline, never for text or fills. The old public-site red `#b00000` and the neon glow are gone; the admin keeps its own palette.

The page runs as a fight in eight rounds — Fokus → Haltung → Kurse → Technik → Coach → Das Gym → Preise → Dein Start — each carrying a round-mark. Every section must read as a still campaign frame. Motion only ever means focus, rhythm or a punch; nothing springs, nothing glows.

**Measured against the reference (Stride Nine hero, own stills):** sky `#0B2336 → #225A7B` and white `#FCFCFD` headline both confirm this palette (kept as B.4.1). The H1 is **Geist 700**, confirmed by a glyph overlay; measured ≈ **6.2vw, line-height ≈ 1.0, tracking ≈ −0.02em** — slightly looser than the earlier spec (7.1vw / 0.88 / −0.04em), so this system adopts the measured values (display-xl ≈ 96px / lh 0.95 / −0.02em at desktop; implement as `clamp(52px, 6.4vw, 118px)`).

## Colors

### Surface

Night and cobalt carry ~85% of every view. `{colors.night-950}` is the section fill and the deepest sky; `{colors.night-900}`/`{colors.night-800}` are raised surfaces and glass; `{colors.cobalt-600}`/`{colors.cobalt-400}` are the sky's middle and horizon inside hero imagery.

### Text

White `{colors.ink}` for headlines, `{colors.body}` (`#D5DEE7`) for running text, `{colors.mute}`/`{colors.mist-600}` for labels and units.

### Accent

`{colors.accent}` (`#E0622C`), `{colors.signal-300}` for hover/soft. **Only** for: the live dot (when a course runs), the "Beste Ersparnis" badge, the active punch name, the active-tab underline, and the orange strich before "Lass uns gemeinsam anpacken!". **Never** for body text or large fills. ≤5% of any view.

### Rules

- Primary button is **white with dark text**, not orange.
- Text over video always sits on a gradient: left `linear-gradient(90deg, rgba(7,19,31,.62) 0%, rgba(7,19,31,.18) 48%, transparent 72%)`; top (for nav) `rgba(7,19,31,.5) → transparent` over 160px.
- Lines / hairlines: `rgba(255,255,255,.14)`, strong `.24`.
- Glass light (buttons): `rgba(255,255,255,.14)` + blur 12px, no border. Glass dark (cards): `rgba(7,19,31,.45)` + blur 18px + 1px `rgba(255,255,255,.10)`.

## Typography

One family: **Geist** (variable, local woff2 — never Google Fonts). Headlines Geist 700 uppercase; body/UI Geist 400/500; numbers `tabular-nums`.

| Role          | Token                        | Use                           |
| ------------- | ---------------------------- | ----------------------------- |
| Display XL    | `{typography.display-xl}`    | H1 (hero), uppercase          |
| Display L     | `{typography.display-lg}`    | H2, punch names, uppercase    |
| Display Words | `{typography.display-words}` | Haltung words, footer marquee |
| Numeric       | `{typography.numeric}`       | prices, stats, LIVE values    |
| Lead          | `{typography.lead}`          | intro paragraphs              |
| Body          | `{typography.body}`          | running text                  |
| UI            | `{typography.ui}`            | nav, buttons                  |
| Label         | `{typography.label}`         | eyebrow, round-mark, LIVE     |

### Principles

- No italics, no gradients in type, no glow.
- H1 two lines, uppercase, tight (lh ~0.95, tracking −0.02em), bottom-anchored in the hero.
- Punch names (Technik) use Display L.

## Layout

- 12-column grid, outer gutter `clamp(20px, 3.9vw, 56px)`, inner 24px.
- Spacing scale: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 160px. Flow sections 160px vertical (mobile 96px).
- Hairline (1px `rgba(255,255,255,.14)`) separates trust rows, number rows, prices, accordion.

## Elevation & Depth

- **No shadows** anywhere except the modal (`0 40px 120px -30px rgba(0,0,0,.6)`).
- **Grain**: SVG `feTurbulence`, 4% opacity, `mix-blend-mode: overlay`, fixed, 8fps jitter — over everything except form fields.
- **Glass**: dark glass for cards/LIVE/modal, light glass for secondary buttons (values under Colors → Rules).
- **Hexagon motif**: thin 1px lines (white 24%), only in Round 06 (gym ceiling lights), the lightbox loader and the favicon. Sparing.
- **Focus field** (hero only): image is sharp near the cursor, soft at the edges; the air drags behind the moving figure. Rest point returns to the coach's face.

## Shapes

Buttons `{rounded.button}` (2px), cards & video frames `{rounded.card}` (6px), chips `{rounded.pill}`. Angular and sporty — no pill-shaped buttons.

## Components

- **Nav** `{components.nav-bar}`: logo left (white, ~28px), links right in `{typography.ui}` (Angebote · Über mich · Preise · Kontakt) + white "Jetzt buchen" button. Transparent over hero; after 80vh becomes dark glass with a bottom hairline (200ms, no jump). Optional round-clock `RUNDE 03 · 1:12` (decision in Phase 3).
- **Buttons**: primary white/dark `↗` `{components.button-primary}`; secondary glass `⊙`/phone `{components.button-glass}`. Hover: +6% brightness, arrow shifts 2px up-right; magnetic pull only on the two hero buttons.
- **Glass card** `{components.glass-card}` and **LIVE card** `{components.live-card}` (260px: `((•)) LIVE IM GYM` + expand, mini 16:10 video, three label/value rows; live dot orange only while a course runs).
- **Round-mark** `{components.round-mark}`: `● RUNDE 02 — HALTUNG`, orange dot, `aria-hidden`.
- **Hairline row** `{components.hairline-row}`: line + 14px icon items.
- **Prices** `{components.price-row}` with tabs `{components.tab}`, `{components.badge-signal}` (only "Beste Ersparnis") and `{components.badge-glass}` (Flexibel / Einmalzahlung / Unverbindlich / Vorauszahlung).
- **Booking fields** `{components.booking-field}`: underline, not boxes; errors in `{colors.signal-300}`.
- **KI-chip** `{components.ki-chip}`: "KI-bearbeitet", bottom-right of every AI-made/-extended medium.
- **Footer** `{components.footer}`: `TRAIN HARD · STAY STRONG ·` marquee in Display Words (outline), motto, socials, legal, AI line.
- **Cursor dot**: 12px, `mix-blend-mode: difference`, lags the pointer; hidden over buttons/links; off on touch and reduced-motion.

## Motion

- Curves: reveals `expo.out` (`cubic-bezier(.16,1,.3,1)`) 0.9–1.1s; transforms `power3.inOut`; hover 160ms ease-out.
- **Line-reveal (signature):** each headline line sits in a mask, rises `yPercent 105 → 0`, stagger 0.08; a 1px line draws in under it (`scaleX 0 → 1`, 0.6s) then fades; type starts at 55% white → full white.
- Nothing springs — no bounces, no wobble, no particles.

## Do's and Don'ts

### Do

- Keep every section presentable as a still frame.
- Keep a path to booking visible in every round (at least the nav button).
- Use real footage where it exists; AI media carries the chip.
- Keep signal-orange to ≤5% and to its five allowed uses.

### Don't

- Don't use orange for text, buttons or large fills.
- Don't bring back the old red `#b00000` or any neon glow on the public site.
- Don't touch the admin's palette or the root `DESIGN.md`.
- Don't make buttons rounded, don't add shadows (except the modal), don't let type glow or use italics.

---

## Update (27.10.2026) — Hero-Wahl, Readout-Schrift & Rundenuhr

**Hero-Variante gewählt:** **Weit** (B.6.1 Variante 1) — Vollbild-Footage, Headline unten links, LIVE-Karte unten rechts.

**Readout-Schrift = Geist Mono (lokal).** Die technischen „Anzeigen" bekommen eine eigene, monospace Lesart: **Geist Mono** (variabel, aus dem offiziellen Vercel-`geist`-npm-Paket, OFL, **lokale woff2** — `node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2`, in Phase 5 nach `app/(site)/fonts/` kopieren). Genutzt für die **Readouts/Status-Anzeigen**: LIVE-Karten-Werte, die **Rundenuhr**, die Standort- und Öffnungszeiten-Zeile (Hairline-Readouts), Medien-Dateinamen-Captions und den KI-Chip. Fließtext, Headlines und UI bleiben **Geist Sans**.

- Typo-Rolle neu: `mono-readout` — Geist Mono, 12–13px, weight 500, letterSpacing +0.02em, tabular; für Label/Wert-Readouts.

**Rundenuhr:** **Ja**, aber als **Status-Readout im gleichen Stil wie „Läuft gerade", die Standort-Anzeige und die Öffnungszeiten** — Geist-Mono-Readout, dezent zwischen Nav-Links und Button (`RUNDE 03 · 1:12`, läuft mit dem Scrollfortschritt 0:00 → 3:00). Kein auffälliges Extra-Element; visuell derselbe ruhige Readout wie die anderen Status-Anzeigen, Signal-Orange nur als kleiner Punkt.

**Schriften-Regel (verschärft, Karahan 27.10.2026):** Beide Familien (Geist Sans + Geist Mono) werden **ausschließlich als lokale Dateien** im Repo ausgeliefert, eingebunden mit `next/font/local` und echten woff2 — **nie** Google Fonts, **nie** `next/font/google`, kein CDN. Sauber umsetzen, nicht „vibe-coded" approximieren: echte Font-Files, korrekte `@font-face`/`next/font/local`, variable Achsen genutzt.
