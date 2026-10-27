# Lighthouse — Stand 27.10.2026 (nach Politur und Rework)

Gemessen gegen `next build && next start` (Produktionsbuild, `http://localhost:3000/`),
Lighthouse 12.8.2.

## Ergebnis

|                                                      | Performance | Barrierefreiheit | Best Practices | SEO |
| ---------------------------------------------------- | ----------- | ---------------- | -------------- | --- |
| **Mobil** (simuliert, Standard)                      | 85          | 100              | 100            | 100 |
| **Mobil** (gemessen, `--throttling-method=devtools`) | **94**      | 100              | 100            | 100 |
| **Desktop**                                          | 98          | 100              | 100            | 100 |

## Kernmetriken

|                 | FCP   | LCP       | TBT   | CLS |
| --------------- | ----- | --------- | ----- | --- |
| Mobil simuliert | 1,2 s | 4,4 s     | 10 ms | 0   |
| Mobil gemessen  | 1,6 s | **2,7 s** | 80 ms | 0   |
| Desktop         | 0,3 s | 1,0 s     | 0 ms  | 0   |

Transfer mobil: 803 KB (B.9-Budget: ≤ 2,5 MB).
First Load JS der Startseite: 161 kB (B.9-Budget: < 180 kB ohne OGL).

## Zum LCP

Die drei Messungen gehen auseinander, darum alle drei:

| Verfahren                                                              | LCP mobil  |
| ---------------------------------------------------------------------- | ---------- |
| Lighthouse simuliert (Lantern-Modell)                                  | 4,4 s      |
| Lighthouse gemessen (echte Drosselung)                                 | 2,7 s      |
| `PerformanceObserver` im Browser, gleiche Drosselung (4× CPU, Slow 4G) | **1,57 s** |

Die Standard-Einstellung von Lighthouse misst den LCP nicht, sie rechnet ihn aus
einem Netzwerkmodell hoch. Zwei unabhängige echte Messungen liegen unter dem
B.9-Ziel von 2,5 s; die simulierte liegt darüber. Nachmessen mit:

```sh
npx lighthouse http://localhost:3000/ --throttling-method=devtools
```

## Rohreports

Die Rohreports (`*.report.html` / `*.report.json`) bleiben lokal und sind in
`.gitignore` — sie enthalten je ~1 MB base64-Screenshots. Neu erzeugen:

```sh
npx lighthouse http://localhost:3000/ --preset=desktop \
  --output=html --output=json --output-path=docs/qa/lighthouse/desktop.report
npx lighthouse http://localhost:3000/ \
  --output=html --output=json --output-path=docs/qa/lighthouse/mobile.report
```
