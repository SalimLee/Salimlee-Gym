# Salim Lee · Content-Produktion mit Nano Banana Pro und Veo 3.1

Version 1.2 · 26.10.2026 · gehört ins Repo `landing-page-web` unter `docs/CONTENT-PRODUKTION.md`

Das hier machst du **vor** dem Claude-Code-Prompt (`docs/CINEMATIC.md`). Am Ende liegen in `assets/content/generated/` acht Bilder (plus optional die enge Hero-Fassung) und sechs Videos mit festen Dateinamen. Claude Code verarbeitet nur diese Dateien und generiert selbst **keine** Bilder von Salim oder anderen echten Menschen.

---

## 1. Grundregeln

### 1.1 Die eine Regel: Salim bleibt Salim

- **Jedes Bild entsteht aus einem echten Standbild** (`assets/content/keyframes/`). Es wird kein Salim „neu erfunden“.
- Erlaubt sind nur: Leinwand erweitern (Outpainting), Text entfernen und eine **globale** Farbkorrektur.
- Nicht erlaubt: Gesicht, Bart, Kopfform, Körper, Tattoos, Kleidung, Haltung, Hände oder Licht auf der Person verändern. Keine Beauty-Retusche, kein „schlanker“, kein „schärfer“.
- Bei jeder Generierung mit Salim kommen **drei Identitäts-Referenzen** mit (Abschnitt 1.4).
- Videos entstehen **immer aus einem freigegebenen Bild** (Veo „Frames to Video“) oder sind echtes Material, das nur geschnitten wird (V04, V07). Es gibt kein Text-zu-Video mit Salim.
- Entschieden: Der Hero zeigt Salim. Es gibt keine generierten Ersatz-Boxer.
- Die Einwilligungen der Sportler in raw_01 und raw_04 liegen vor, die Videos sind frei nutzbar (26.10.2026).

### 1.2 Werkzeuge

| Schritt | Werkzeug | Modus | Einstellung |
|---|---|---|---|
| Bilder | **Nano Banana Pro** (Gemini 3 Pro Image), am besten in Google AI Studio | Bild + Text | Seitenverhältnis wie angegeben, Auflösung **4K** |
| Videos aus Bild | **Google Flow**, Modell **Veo 3.1 – Quality** | Frames to Video (Start- und Endbild) | 16:9 oder 9:16, **8 s**, in höchster angebotener Auflösung herunterladen |

Omni in Flow hat die eingebrannten Untertitel nicht sauber entfernt (Stand 26.10.2026). Deshalb wurden die echten Clips V04 und V07 so geschnitten, dass keine Schrift mehr im Bild ist (erledigt). V01m kommt wie V01 aus Veo.

### 1.3 Der Look (aus der Stride-Nine-Vorschau gemessen)

| Token | Hex | Wo |
|---|---|---|
| Nacht | `#0E273D` | oberer Himmel, dunkelste Fläche |
| Kobalt tief | `#132E48` | Himmel oben-mitte |
| Kobalt | `#224565` | Himmel Mitte |
| Horizont | `#436886` | Himmel unten, Nebel-Lichter |
| Signal-Orange | `#E0622C` | nur als Akzent (Lichtkanten, Praktikerlichter in B05/B06) |

Bildsprache: Sport-Kampagne, nicht Stockfoto. Tiefes, gesättigtes Kobaltblau, klares Licht, satte aber zeichnende Schatten, feines 35-mm-Korn, Bewegungsunschärfe nur an schnellen Fäusten. Große ruhige Fläche links für die Headline.

### 1.4 Bausteine, die in jeden Prompt mit Salim gehören

Lade die Bilder **in dieser Reihenfolge** hoch: zuerst das Hauptbild (Keyframe), dann die drei Referenzen.

Referenz-Set (immer gleich):

1. `reference/ref_salim_01_portrait-handwraps_hq.jpg`
2. `reference/ref_salim_02_kopf-frontal_speedball.png`
3. `reference/ref_salim_06_kopf-dreiviertel_speedball.png`

**Baustein IDENTITY LOCK** (am Ende jedes Prompts mit Salim anhängen):

```text
IDENTITY LOCK — Every person in image 1 is a fixed photographic plate.
Do not change faces, head shape, beard, skin tone, body shape, muscles,
tattoos, clothing, printed logos on clothing, gloves, mitts, pose, hand
and foot positions, or the light falling on them. No beautifying, no
slimming, no de-aging, no face sharpening, no re-lighting, no new
expression. The bald man with the full dark beard is the coach, Salim.
Images 2–4 show the same man only so you can keep his face accurate at
higher resolution. Do not copy their backgrounds, clothing or lighting.
Do not add, remove or duplicate any person. No extra fingers or limbs.
```

Bei Motiven ohne die Referenzen 2–4 (B05, B08, B08m) die beiden Sätze „Images 2–4 show …“ und „Do not copy their backgrounds …“ weglassen. Dort ist Bild 2 nur Farbreferenz, das steht im jeweiligen Prompt.

**Baustein CLEAN** (immer anhängen):

```text
CLEAN — Remove every caption, subtitle, emoji and on-screen text. Rebuild
what was behind it seamlessly (grass, sky, fabric, floor). The final image
contains no text, no letters, no watermark, no UI. Printed logos that
physically exist on clothing stay exactly as they are.
```

**Baustein GRADE** (Farbkorrektur, immer gleich, damit alles aus einer Hand wirkt):

```text
GRADE — Global color grade only, applied evenly to the whole image:
deep saturated cobalt sky darkening toward the top (#0E273D at the top,
#224565 in the middle, #436886 near the horizon), clean crisp daylight,
greens pulled slightly toward teal and a little desaturated, rich shadows
that keep detail, neutral true-to-life skin tones, fine 35mm film grain.
Cinematic sports-campaign look. Not HDR, not oversharpened, no orange-teal
cliché, no vignette, no lens flares.
```

### 1.5 Vorgehen pro Motiv

1. Prompt einfügen, Bilder in der angegebenen Reihenfolge hochladen, **4 Varianten** erzeugen.
2. Die beste Variante nach der **Abnahme-Checkliste** (Abschnitt 4) prüfen, auf 100 % Zoom.
3. Kleine Fehler mit einem Folge-Prompt im selben Chat korrigieren (Beispiele in Abschnitt 4). Große Fehler: neu starten, nicht flicken.
4. Mit dem **exakten Dateinamen** in `assets/content/generated/bilder/` bzw. `…/videos/` speichern.

---

## 2. Bilder (Nano Banana Pro)

### B01 · Hero-Leitbild 16:9 (mit Coach) — Empfehlung

Das wichtigste Bild der Seite. Es ist zugleich das **Leitbild**: Alle weiteren Bilder bekommen es als Farbreferenz, so wie in der Anleitung beschrieben.

- **Hauptbild:** `keyframes/kf_01b_pratzen-feld-cross_t05.2.png`
- **Dazu:** Referenz-Set 1.4
- **Format:** 16:9 · 4K
- **Speichern als:** `generated/bilder/gen_b01_hero-leitbild_16x9.png`

```text
Image 1 is a real photo of boxing coach Salim (bald, full dark beard, white
T-shirt, black shorts, holding black focus mitts) and his athlete (white
T-shirt, white shorts, boxing gloves) doing pad work on a sunny grass
sports field. Turn this vertical 9:16 frame into a cinematic 16:9 hero
image for a premium boxing gym website.

CANVAS — Extend the scene to 16:9 landscape by outpainting left and right.
Continue the grass field, the tree line and the sky naturally, matching
the original perspective, wide-angle lens, sun direction and shadow length.
Place both people in the right half of the frame, their center at about
68% of the width, at the same size relative to the frame height as in the
original. Keep the left 55% calm and open (sky above, field below) for a
large headline. Horizon stays at the same height as in the original.

[GRADE]
Add subtle natural motion blur only to the athlete's fast-moving glove.

[CLEAN]

[IDENTITY LOCK]

Output: photorealistic, 16:9, 4K.
```

`[GRADE]`, `[CLEAN]` und `[IDENTITY LOCK]` jeweils durch den Baustein aus 1.4 ersetzen.

**Variante B01-eng** im selben Chat (für Hero-Variante 2 in Stitch, und falls die Personen in B01 zu klein wirken):

```text
Same image, tighter crop: recompose as 16:9 so that the two people fill
about 75% of the frame height (cut just below the knees). Keep them in the
right half. Use images 2–4 to keep the coach's face exactly as it is in
image 1 at this larger size. Nothing about the people may change.
```

Speichern als `gen_b01_hero-leitbild-eng_16x9.png`. In Phase 3 von Claude Code wird entschieden, welche Fassung genommen wird.

### B01m · Hero-Leitbild 9:16 (Mobil)

- **Hauptbild:** `keyframes/kf_01b_pratzen-feld-cross_t05.2.png`
- **Dazu:** Referenz-Set 1.4, als **5. Bild** `gen_b01_hero-leitbild_16x9.png` (Farbreferenz)
- **Format:** 9:16 · 4K
- **Speichern als:** `generated/bilder/gen_b01m_hero-leitbild_9x16.png`

```text
Keep image 1 exactly in its 9:16 framing — no crop, no outpainting, no
recomposition. Only clean it and grade it so that its colors match image 5
exactly (image 5 is the approved 16:9 version of the same scene).

[CLEAN]
[GRADE]
[IDENTITY LOCK]

Output: photorealistic, 9:16, 4K.
```

Wichtig: B01m hat **exakt** den Bildausschnitt des Keyframes. Claude Code berechnet daraus eine Farb-LUT und gibt allen echten Clips denselben Look.

### B03a · Haltung, Startbild 16:9 (Nebel → Blaue Stunde)

- **Hauptbild:** `keyframes/kf_02a_nebel-pfad-shadowboxing_t03.0.png`
- **Dazu:** `reference/ref_salim_05_hoodie-guard_nebel.png`, `ref_salim_02…`, `ref_salim_01…` (Gesicht im Hoodie zuerst), als **5. Bild** `gen_b01_hero-leitbild_16x9.png`
- **Format:** 16:9 · 4K
- **Speichern als:** `generated/bilder/gen_b03a_haltung-nebel-start_16x9.png`

```text
Image 1 is a real photo of coach Salim in a black hoodie (hood up) and
black training pants, shadowboxing on a narrow dirt path along a grassy
hillside in fog. Turn it into a cinematic 16:9 still.

CANVAS — Outpaint left and right: more steep hillside, the dirt path,
bare twisted trees fading into dense fog. Keep him at the same size and
at about 62% of the width. The left half stays quiet, mostly fog.

GRADE — Turn the flat grey daylight fog into deep blue-hour fog: cold
cobalt and steel-blue atmosphere (#0E273D in the darkest areas, #436886 in
the brightest fog), layered mist with depth, desaturated grass, soft
diffused light, fine 35mm film grain. Match the blue of image 5.

[CLEAN]
[IDENTITY LOCK]  (images 2–4 here are the hoodie close-up and two face
references of the same man)

Output: photorealistic, 16:9, 4K.
```

### B03b · Haltung, Endbild 16:9

- **Hauptbild:** `keyframes/kf_02c_nebel-pfad-weggehen_t11.0.png`
- **Dazu:** `gen_b03a_haltung-nebel-start_16x9.png` als 2. Bild (Farb- und Ortsreferenz)
- **Format:** 16:9 · 4K
- **Speichern als:** `generated/bilder/gen_b03b_haltung-nebel-ende_16x9.png`

```text
Image 1 shows the same man as in image 2 walking away up the foggy path,
small in the frame. Make it the matching end frame of the same scene:
outpaint to 16:9 so that the path, the hillside and the trees continue
naturally, keep the walking figure exactly as it is (size, posture,
clothing), and grade it identically to image 2 (deep blue-hour fog).
[CLEAN]
Do not add or remove any person. Output: photorealistic, 16:9, 4K.
```

### B05 · Coach-Porträt 21:9

- **Hauptbild:** `reference/ref_salim_01_portrait-handwraps_hq.jpg` (das Original, 3:2)
- **Dazu:** `gen_b01_hero-leitbild_16x9.png` als 2. Bild (nur Farbstimmung)
- **Format:** 21:9 · 4K
- **Speichern als:** `generated/bilder/gen_b05_coach-portrait_21x9.png`

```text
Image 1 is a real portrait of coach Salim wrapping his hands in a dark
boxing gym. Extend it to a cinematic 21:9 frame by outpainting left and
right: continue the dark gym naturally — hanging heavy bags, matte black
floor, ceiling spotlights, faint haze. Salim stays exactly where he is
relative to the frame height, slightly right of center.

GRADE — Global only: shift the ambient shadows toward deep cobalt
(#0E273D to #224565), turn the red practical lights in the background into
a warm signal orange (#E0622C), keep his skin, tattoos, yellow tank top and
the red/black hand wraps exactly as they are. Fine film grain. Keep the
mood: dark, focused, quiet. Image 2 is only a color reference.

[IDENTITY LOCK]  (ohne die Sätze zu Bild 2–4, siehe 1.4)

Output: photorealistic, 21:9, 4K, no text.
```

### B06 · Das Gym 16:9

- **Hauptbild:** `public/Boxring.jpeg` (3:4)
- **Dazu:** `gen_b01_hero-leitbild_16x9.png` als 2. Bild
- **Format:** 16:9 · 4K
- **Speichern als:** `generated/bilder/gen_b06_gym-ring_16x9.png`

```text
Image 1 is a real photo of the boxing ring in Salim Lee's gym: black ring
canvas, white ropes with red corner pads, hexagon LED ceiling lights,
windows, white columns, wooden floor. Extend it to a cinematic 16:9 frame
(outpaint left and right, continuing the real room: more windows, columns,
heavy bags along the wall). Keep the ring, the ceiling lights and the
architecture exactly as they are.

GRADE — Evening mood: the windows show deep blue dusk (#132E48), the room
is dim, the hexagon LEDs glow cool white and become the main light, faint
haze makes their light visible, the wooden floor keeps a warm tone, the red
corner pads shift slightly toward signal orange (#E0622C). Fine film grain.
No people. No text. Output: photorealistic, 16:9, 4K.
```

### B08 · Dein Start 16:9 (Seilspringen im Nebel)

- **Hauptbild:** `keyframes/kf_03e_nebel-huegel-seilspringen_t55.5.png`
- **Dazu:** `gen_b03a_haltung-nebel-start_16x9.png` als 2. Bild (gleiche Nebelfarbe)
- **Format:** 16:9 · 4K
- **Speichern als:** `generated/bilder/gen_b08_start-seilspringen_16x9.png`

```text
Image 1 is a real photo of coach Salim jumping rope alone on top of a misty
hill. Make a wide cinematic 16:9 frame: outpaint left and right (the flat
hilltop, a few low bushes, the bench on the left edge, endless fog).
Salim stays small, centered, in the lower third. Grade the fog to the same
deep blue-hour tone as image 2. Large calm fog area above him for a
headline.
[CLEAN]
[IDENTITY LOCK]  (ohne die Sätze zu Bild 2–4; er ist klein im Bild,
Haltung, Seil und Kleidung exakt beibehalten)
Output: photorealistic, 16:9, 4K.
```

### B08m · Dein Start 9:16 (Mobil und Farbvorlage Nebel)

- **Hauptbild:** `keyframes/kf_03e_nebel-huegel-seilspringen_t55.5.png`
- **Dazu:** `gen_b08_start-seilspringen_16x9.png` als 2. Bild (Farbreferenz)
- **Format:** 9:16 · 4K
- **Speichern als:** `generated/bilder/gen_b08m_start-seilspringen_9x16.png`

```text
Keep image 1 exactly in its 9:16 framing — no crop, no outpainting, no
recomposition. Only grade it so that its colors match image 2 exactly
(deep blue-hour fog). Nothing else changes.
[CLEAN]
[IDENTITY LOCK]  (ohne die Sätze zu Bild 2–4)
Output: photorealistic, 9:16, 4K.
```

Wie bei B01m: Der Bildausschnitt ist identisch mit dem Keyframe. Daraus berechnet Claude Code die zweite Farb-LUT („Nebel“) für alle echten Nebel-Clips.

---

## 3. Videos

Alle Videos ohne Ton (wird ohnehin entfernt), keine Musik, keine Sprache. Bei jedem Video **2–4 Durchläufe** erzeugen und den ruhigsten nehmen.

### V01 · Hero-Loop 16:9 (Veo 3.1 Quality, Frames to Video)

- **Startbild:** `gen_b01_hero-leitbild_16x9.png` (bzw. die gewählte eng-Fassung)
- **Endbild:** dasselbe Bild (so entsteht ein nahtloser Loop)
- **Format:** 16:9 · 8 s
- **Speichern als:** `generated/videos/gen_v01_hero-loop_16x9.mp4`

```text
Cinematic slow-motion sports-campaign shot. Locked-off tripod camera, no
camera movement at all. On a sunlit grass field under a deep cobalt-blue
sky, the athlete in white throws a crisp jab and a straight right into the
coach's focus mitts; the coach absorbs both punches with a small step,
then both return to guard. Movement at about half real-time speed, with
natural weight, balance and footwork. Grass moves slightly in the wind,
small clouds drift slowly. The last frame returns exactly to the first
frame's pose for a seamless loop.
Faces, bodies, clothing and colors stay exactly as in the start frame —
no morphing, no new people, no extra limbs, no cuts, no text.
Audio: none.
```

### V01m · Hero-Loop 9:16 Mobil (Veo 3.1 Quality, Frames to Video) · noch offen

- **Startbild:** `gen_b01m_hero-leitbild_9x16.jpg`
- **Endbild:** dasselbe Bild (nahtloser Loop)
- **Format:** 9:16 · 8 s
- **Prompt:** derselbe wie bei V01 (oben), unverändert
- **Speichern als:** `generated/videos/gen_v01m_hero-loop_9x16.mp4`

Fehlt V01m, zeigt Mobil das Standbild B01m mit langsamem Zoom (siehe `docs/CINEMATIC.md`, B.7).

### V03 · Haltung 16:9 (Veo 3.1 Quality, Frames to Video)

- **Startbild:** `gen_b03a_haltung-nebel-start_16x9.png`
- **Endbild:** `gen_b03b_haltung-nebel-ende_16x9.png`
- **Format:** 16:9 · 8 s
- **Speichern als:** `generated/videos/gen_v03_haltung-nebel_16x9.mp4`

```text
Moody cinematic shot in dense blue-hour fog on a narrow dirt path along a
steep grassy hillside, bare trees fading into the mist. The man in the
black hoodie (hood up) shadowboxes slowly on the spot — short jabs, tight
guard, controlled breathing — then lowers his hands, turns around and
walks calmly up the path into the fog until he is a small silhouette.
Very steady camera with a barely noticeable slow drift backward. Cold
deep-blue grade, soft diffused light, fine film grain.
His face, hoodie and pants stay exactly as in the start frame — no
morphing, no extra people, no text, no cuts. Audio: none.
```

### V04 · Technik: Kombinationen · erledigt (echter Clip)

- **Datei:** `generated/videos/gen_v04_kombis-clean-kurz_9x16.mp4` (720×1280, 30 fps, 3,3 s)
- Echte Aufnahme aus `raw/sl_raw_04…`, nur geschnitten, „BOXIQ“ entfernt, keine Schrift im Bild. Personen unverändert.
- Die Schlagnamen setzt Claude Code als eigene Typografie im Takt (alle 0,8 s), nicht synchron zum Video (`docs/CINEMATIC.md`, B.6.4).

### V07 · Kurs-Karte Personal Training: Speedball · erledigt (echter Clip)

- **Datei:** `generated/videos/gen_v07_speedball-clean_4x5.mp4` (720×896, 24 fps, 10 s)
- Echte Aufnahme aus `omni_in_05…`, auf 4:5 oberhalb der Untertitel zugeschnitten. Person unverändert.

### V08 · Dein Start: Seilspringen 16:9 (Veo 3.1 Quality, Frames to Video)

- **Startbild:** `gen_b08_start-seilspringen_16x9.png`
- **Endbild:** dasselbe Bild (Loop)
- **Format:** 16:9 · 8 s
- **Speichern als:** `generated/videos/gen_v08_start-seilspringen_16x9.mp4`

```text
Wide static shot, locked-off camera. A lone shirtless man jumps rope on top
of a misty hill in a steady, relaxed rhythm, the rope a soft blur. Dense
blue-hour fog drifts slowly from right to left across the frame; vast calm
fog above him. He stays small in the lower third and does not move across
the frame. The last frame matches the first for a seamless loop.
No other people, no text, no cuts, no morphing. Audio: none.
```

---

## 4. Abnahme-Checkliste (jedes Ergebnis, 100 % Zoom)

**Person**

- [ ] Gesicht neben `ref_salim_01` und `ref_salim_02` gelegt: Augen, Brauen, Nase, Bartlinie, Ohren gleich?
- [ ] Kopfform, Hautton, Statur, Tattoos (wo sichtbar) unverändert?
- [ ] Kleidung, Logos auf Kleidung, Handschuhe und Pratzen wie im Original?
- [ ] Hände: fünf Finger, keine verschmolzenen Handschuhe, keine zusätzlichen Gliedmaßen?
- [ ] Keine neue oder doppelte Person, auch nicht klein im Hintergrund?

**Bild**

- [ ] Kein Rest von Untertiteln, keine Fantasie-Schrift, kein Wasserzeichen?
- [ ] Übergang zwischen Original und Erweiterung unsichtbar (Horizont, Rasenlinien, Schatten)?
- [ ] Farbe passt zu B01 (Himmel-Blau, Schwärzen, Hautton)?
- [ ] Linke Bildhälfte ruhig genug für eine große weiße Headline?

**Video zusätzlich**

- [ ] Gesicht morpht nicht, auch nicht in Sekunde 6–8?
- [ ] Loop-Naht (V01, V08): letztes und erstes Bild passen?
- [ ] Bewegung physikalisch glaubwürdig (Gewicht, Fußarbeit, Schlagtreffer)?

**Korrektur-Prompts** (im selben Chat):

```text
The coach's face drifted from the original. Restore his face exactly as in
image 1 (use images 2–4), change nothing else.
```

```text
There is still a trace of text at the lower center. Remove it and rebuild
the grass there. Change nothing else.
```

```text
The extension on the left looks duplicated (repeated trees). Re-generate
only the left 40% with a natural, non-repeating tree line.
```

---

## 5. Übergabe an Claude Code

Wenn alles abgenommen ist, liegen diese Dateien da:

```
assets/content/generated/bilder/          (.jpg oder .png, beides geht)
  gen_b01_hero-leitbild_16x9.jpg
  gen_b01m_hero-leitbild_9x16.jpg
  gen_b03a_haltung-nebel-start_16x9.jpg
  gen_b03b_haltung-nebel-ende_16x9.jpg
  gen_b05_coach-portrait_21x9.jpg
  gen_b06_gym-ring_16x9.jpg
  gen_b08_start-seilspringen_16x9.jpg
  gen_b08m_start-seilspringen_9x16.jpg
assets/content/generated/videos/
  gen_v01_hero-loop_16x9.mp4
  gen_v01m_hero-loop_9x16.mp4             (noch offen, sonst Standbild B01m)
  gen_v03_haltung-nebel_16x9.mp4
  gen_v04_kombis-clean-kurz_9x16.mp4
  gen_v07_speedball-clean_4x5.mp4
  gen_v08_start-seilspringen_16x9.mp4
```

Fehlt eine Datei, baut Claude Code den Abschnitt mit dem passenden Standbild oder dem echten Clip-Ausschnitt (siehe `docs/CINEMATIC.md`, B.11) und meldet es im Bericht.

**KI-Kennzeichnung:** Seit dem 2. August 2026 gilt die Transparenzpflicht des AI Act (Art. 50 Abs. 4). Für KI-erzeugte oder -veränderte Videos und Bilder einer realen Person gilt das, wenn sie echt wirken. Die Seite bekommt deshalb einen dezenten, aber sichtbaren Hinweis „KI-bearbeitet“ an den betroffenen Medien. Ein Hinweis nur in den AGB oder im Menü reicht nicht. Bitte rechtlich prüfen lassen, ich bin kein Anwalt.
