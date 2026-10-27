# Lighthouse — Stand 27.10.2026

Gemessen gegen `next build && next start` (Produktionsbuild, `http://localhost:3000/`),
Lighthouse 12.8.2, Standard-Drosselung (Mobil: Moto G Power, Slow 4G, CPU ×4).

|             | Performance | Barrierefreiheit | Best Practices | SEO |
| ----------- | ----------- | ---------------- | -------------- | --- |
| **Mobil**   | 88          | 100              | 100            | 100 |
| **Desktop** | 99          | 100              | 100            | 100 |

Kernmetriken

|             | FCP   | LCP   | TBT   | CLS | Transfer |
| ----------- | ----- | ----- | ----- | --- | -------- |
| **Mobil**   | 0,9 s | 3,9 s | 10 ms | 0   | 1,05 MB  |
| **Desktop** | 0,4 s | 1,0 s | 0 ms  | 0   | 1,1 MB   |

Offen: LCP mobil 3,9 s (Ziel < 2,5 s). Der LCP ist der Hero-Fließtext, nicht das
Bild — er wartet auf die lokalen Schriften. Nächster Hebel wäre ein Subset der
Geist-Variable (nur die benötigten Glyphen) oder `size-adjust`-Fallback.

Die Rohreports (`*.report.html` / `*.report.json`) bleiben lokal und sind in
`.gitignore` — sie enthalten je ~1 MB base64-Screenshots. Neu erzeugen:

```sh
npx lighthouse http://localhost:3000/ --preset=desktop \
  --output=html --output=json --output-path=docs/qa/lighthouse/desktop.report
npx lighthouse http://localhost:3000/ \
  --output=html --output=json --output-path=docs/qa/lighthouse/mobile.report
```
