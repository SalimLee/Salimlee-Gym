# Content-Ordner · Salim Lee Cinematic Redesign

Stand 26.10.2026. Alle Rohdateien sind 9:16-Instagram-Clips von Salim. Sie bleiben **lokal** und kommen nicht ins Git (siehe `docs/CINEMATIC.md`, Teil A). Ins Repo kommen nur die aufbereiteten Web-Dateien unter `public/media/`.

```
assets/content/
  raw/            umbenannte Originale (nicht verändern)
  keyframes/      saubere Standbilder ohne Text, Eingabe für Nano Banana Pro
    _mit-text/    Standbilder mit Untertiteln (nur falls ein Motiv genau dort gebraucht wird)
  reference/      Identitäts-Referenzen von Salim, Text weggeschnitten
    _roh/         dieselben Bilder ungeschnitten
  omni-input/     auf ≤ 10 s geschnittene Clips ohne Ton, fertig zum Hochladen in Flow (Omni)
  generated/
    bilder/       Ergebnisse aus Nano Banana Pro  → Dateinamen siehe docs/CONTENT-PRODUKTION.md
    videos/       Ergebnisse aus Veo 3.1 + zwei geschnittene echte Clips (V04, V07) → Dateinamen siehe docs/CONTENT-PRODUKTION.md
```

## Rohclips (alt → neu)

| Neu | Alt (Instagram-Code) | Format | Länge | Inhalt | Text im Bild |
|---|---|---|---|---|---|
| `sl_raw_01_pratzen-feld-blauer-himmel_9x16.mp4` | `Dbc6ltls5o5` | 720×1280, 30 fps | 24,2 s | Salim (weißes Shirt, schwarze Shorts) hält Pratzen, Sportler in Weiß schlägt. Sportplatz, tiefblauer Himmel. Ab ~14 s zweite Kamera mit Wolken und Rasensprenger. | rot-weiße Karaoke-Untertitel fast durchgehend |
| `sl_raw_02_nebel-pfad-shadowboxing-hoodie_9x16.mp4` | `C6JhNTFNTbZ` | 1080×1920, 30 fps | 25,7 s | Salim im schwarzen Hoodie, Shadowboxing auf einem Pfad im Nebel, kommt auf die Kamera zu, dreht ab und geht in den Nebel. | weiße Untertitel unten, mit Lücken |
| `sl_raw_03_nebel-wiese-conditioning-montage_9x16.mp4` | `DCM9N3Os0aX` | 720×1278, 30 fps | 73,0 s | Montage: Shadowboxing oberkörperfrei auf Nebelwiese, Herbstpfad, Box-Jumps auf Paletten, Seilspringen auf Nebelhügel. | einzelne weiße Wörter. **Ton ist ein Filmmonolog (urheberrechtlich geschützt), nie verwenden.** |
| `sl_raw_04_pratzen-vogelperspektive-kombis_9x16.mp4` | `DeEnIzFskBd` | 720×1280, 30 fps | 9,0 s | Vogelperspektive: Salim (schwarzes „SALIM LEE“-Shirt, rote Shorts) hält Pratzen, Sportler im grün-schwarzen Tanktop schlägt Kombinationen. Dunkle Matten. | „BOXIQ“, „Jab“, „Hook“, „Right Slip“, „Roll back“, „Cross“, „Uppercut“ |
| `sl_raw_05_speedball-tutorial-gym_9x16.mp4` | `Dbn-nl9sQOC` | 720×1280, 24 fps | 32,3 s | Salim erklärt den Speedball im Gym mit Hexagon-Licht, Booster-Sandsack. | rot-weiße Karaoke-Untertitel fast durchgehend |
| `sl_raw_06_wandpolster-handschuhgewichte_9x16.mp4` | `C64NmJTtYJb` | 1080×1920, 30 fps | 17,4 s | Salim schlägt aufs Wandpolster, Handschuhgewichte 18 → 8 oz. Pinker Boden, pastellgrüne Säule (passt farblich schlecht). | „18 OZ 🥊“ usw. oben |

## Textfreie Zeitfenster (für echte Clips ohne KI)

Gemessen per Bildanalyse und Sichtprüfung im Sekundenraster. **In Phase 4 framegenau nachprüfen.**

| Clip | Ohne Text (ca.) |
|---|---|
| raw_01 | 0,6–1,3 · 4,9–5,6 · 7,3–7,8 · 15,8–18,0 · 21,4–21,9 s |
| raw_02 | 6,5–7,9 (Schnitt auf Schulter) · 10,6–11,9 · 13,8–15,9 · 18,8–25,5 s (Pfad leer ab ~20 s) |
| raw_03 | 13,6–17,9 (Shadowboxing Wiese) · 19,6–21,9 · 39,0–44,9 (Herbstpfad) · 46,6–48,9 (Box-Jump) · 52,6–56,9 (Seilspringen) s |
| raw_04 | 8,0–9,0 s (sonst Labels) |
| raw_05 | 19,2–19,9 · 21,3–21,7 · 24,9–25,8 · 27,5–27,9 · 31,0–32,1 s |
| raw_06 | 8,0–10,9 · 15,0–17,4 s |

## Keyframes (textfrei, Originalauflösung)

| Datei | Motiv | Einsatz |
|---|---|---|
| `kf_01a_pratzen-feld-jab_t01.0.png` | Jab in die Pratze, beide Personen ganz im Bild | Hero-Alternative |
| `kf_01b_pratzen-feld-cross_t05.2.png` | Sportler streckt Cross, Salim fängt | **Hero-Leitbild (Empfehlung)** |
| `kf_01c/d/f_…wolken…` | zweite Kamera, Wolken, Rasensprenger, Clinch | Reserve |
| `kf_01e_pratzen-feld-guard_t07.5.png` | Deckung, Reset | Loop-Endbild |
| `kf_02a_nebel-pfad-shadowboxing_t03.0.png` | Hoodie, Shadowboxing auf dem Pfad | Haltung: Startbild |
| `kf_02c_nebel-pfad-weggehen_t11.0.png` | geht in den Nebel | Haltung: Endbild |
| `kf_02d_nebel-pfad-leer_t21.0.png` | Pfad leer | Reserve / Hintergrund |
| `kf_03a/b_nebel-wiese-shadowboxing` | oberkörperfrei auf Nebelwiese | Kurs-Karte / Reserve |
| `kf_03c_herbst-pfad-shadowboxing_t42.0.png` | Herbstpfad | Reserve |
| `kf_03d_herbst-boxjump_t47.0.png` | Box-Jump | Kurs-Karte Freies Training |
| `kf_03e_nebel-huegel-seilspringen_t55.5.png` | Seilspringen auf Nebelhügel | Abschluss „Dein Start“ |
| `kf_04b_pratzen-vogelperspektive_t08.3.png` | Vogelperspektive | Technik (Poster) |
| `kf_05a/b/c_speedball-gym` | Speedball | Kurs-Karte Personal Training (Poster) |
| `kf_06a/b_wandpolster` | Wandpolster | Reserve |

## Identitäts-Referenzen (bei jeder Nano-Banana-Generierung mit Salim mitgeben)

| Datei | Zweck |
|---|---|
| `ref_salim_01_portrait-handwraps_hq.jpg` | bestes Foto (1600×1068): Gesicht, Bart, Tattoos |
| `ref_salim_02_kopf-frontal_speedball.png` | Kopf frontal |
| `ref_salim_03_kopf-frontal-2_speedball.png` | Kopf frontal, zweite Mimik |
| `ref_salim_06_kopf-dreiviertel_speedball.png` | Kopf Dreiviertel |
| `ref_salim_04_koerper-tattoos-stance_wandpolster.png` | Körper, Arm-Tattoos, Stand |
| `ref_salim_05_hoodie-guard_nebel.png` | Gesicht im Hoodie |
| `ref_salim_07_ganzkoerper-weiss-pratzen_feld.png` | Ganzkörper im Feld-Outfit |
| `ref_logo_salimlee_weiss.png` | Logo, nur als Referenz |

## Omni-Eingaben (Flow → Video bearbeiten, max. 10 s)

Omni hat die Untertitel nicht sauber entfernt (26.10.2026). V04 und V07 sind deshalb aus diesen Clips zugeschnitten, V01m kommt aus Veo (B01m). Die Dateien bleiben nur als Quelle.

| Datei | Quelle | Ziel |
|---|---|---|
| `omni_in_01a_pratzen-feld_t00-10_9x16.mp4` | raw_01, 0–10 s | Mobil-Hero ohne Untertitel |
| `omni_in_01b_pratzen-feld-wolken_t14-24_9x16.mp4` | raw_01, 14–24 s | Alternative Mobil-Hero |
| `omni_in_04_kombis-vogelperspektive_t00-09_9x16.mp4` | raw_04, ganz | Technik ohne Labels |
| `omni_in_05_speedball_t19-29_9x16.mp4` | raw_05, 19–29 s | Kurs-Karte Personal Training |
