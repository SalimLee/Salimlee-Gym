#!/usr/bin/env node
/**
 * scripts/cinematic/media.mjs — Salim Lee Cinematic (Phase 4, B.11.1)
 *
 * Bereitet alle Web-Medien aus assets/content/ (lokal, gitignored) nach public/media/
 * auf: Schnitte, LUTs, Kodierung (H.264 + optional AV1), AVIF-Poster, Logo-WebP.
 * Dateinamen tragen einen Inhalts-Hash. Schreibt zum Schluss content/media.ts.
 *
 * Reine ffmpeg-Pipeline (kein sharp): AVIF via avif-Muxer + libsvtav1, Video H.264 + SVT-AV1.
 * Fehlt eine generated-Quelle, wird der Rueckfall genutzt und gemeldet (B.11).
 *
 * Aufruf:
 *   node scripts/cinematic/media.mjs            # H.264 + AVIF (schnell)
 *   node scripts/cinematic/media.mjs --av1      # zusaetzlich AV1 (langsam)
 *   node scripts/cinematic/media.mjs --clean    # public/media vorher leeren
 *
 * ponytail: nahtloser Loop-Crossfade (letzte 0,4 s) ist als Phase-6-Politur vermerkt,
 * hier wird sauber geschnitten/geloopt ohne Crossfade.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const SRC = path.join(ROOT, "assets/content");
const GEN = path.join(SRC, "generated");
const OUT = path.join(ROOT, "public/media");
const LUT = (n) => path.join(ROOT, "scripts/cinematic/luts", n);
const WANT_AV1 = process.argv.includes("--av1");
const CLEAN = process.argv.includes("--clean");

const table = [];
const warnings = [];
const registry = {};

// ---------- helpers ----------
const exists = (p) => fs.existsSync(p);
function pickSrc(...cands) {
  for (const c of cands) if (c && exists(c)) return c;
  return null;
}
function run(args) {
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], {
    stdio: ["ignore", "ignore", "inherit"],
  });
}
function hash8(file) {
  return createHash("sha1")
    .update(fs.readFileSync(file))
    .digest("hex")
    .slice(0, 8);
}
function finalize(tmp, outRel) {
  // haengt Inhalts-Hash vor die Endung: name.[hash].ext
  const h = hash8(tmp);
  const ext = path.extname(outRel);
  const base = outRel.slice(0, -ext.length);
  const finalRel = `${base}.${h}${ext}`;
  const dst = path.join(OUT, finalRel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.renameSync(tmp, dst);
  const bytes = fs.statSync(dst).size;
  return { rel: `/media/${finalRel}`, bytes };
}
function tmpFile(ext) {
  return path.join(
    os.tmpdir(),
    `slmedia_${Math.random().toString(36).slice(2)}.${ext}`,
  );
}
function probe(file) {
  try {
    const out = execFileSync("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,duration",
      "-of",
      "csv=p=0",
      file,
    ])
      .toString()
      .trim();
    const [w, h, d] = out.split(",");
    return { w: +w, h: +h, dur: d ? +d : null };
  } catch {
    return { w: 0, h: 0, dur: null };
  }
}
const kb = (b) => `${(b / 1024).toFixed(0)} KB`;
const mb = (b) => `${(b / 1048576).toFixed(2)} MB`;

// ---------- encoders ----------
function encVideoH264(
  src,
  outRel,
  { w, crf = 22, extraVf = [], fps = 25, loop = null } = {},
) {
  const tmp = tmpFile("mp4");
  const vf = [`scale=${w}:-2:flags=lanczos`, ...extraVf, "format=yuv420p"].join(
    ",",
  );
  const args = [];
  if (loop)
    args.push("-ss", String(loop.ss), "-t", (loop.to - loop.ss).toFixed(3));
  args.push(
    "-i",
    src,
    "-an",
    "-vf",
    vf,
    "-r",
    String(fps),
    "-c:v",
    "libx264",
    "-profile:v",
    "high",
    "-crf",
    String(crf),
    "-maxrate",
    "6M",
    "-bufsize",
    "12M",
    "-g",
    String(fps * 2),
    "-movflags",
    "+faststart",
    tmp,
  );
  run(args);
  const info = probe(tmp);
  const { rel, bytes } = finalize(tmp, outRel);
  table.push([
    path.basename(rel),
    `${info.w}x${info.h}`,
    info.dur ? `${info.dur.toFixed(1)}s` : "-",
    mb(bytes),
    "H.264",
    path.basename(src),
  ]);
  return { src: rel, w: info.w, h: info.h, dur: info.dur, bytes };
}
function encVideoAV1(
  src,
  outRel,
  { w, crf = 34, extraVf = [], fps = 25, loop = null } = {},
) {
  if (!WANT_AV1) return null;
  const tmp = tmpFile("mp4");
  const vf = [`scale=${w}:-2:flags=lanczos`, ...extraVf, "format=yuv420p"].join(
    ",",
  );
  const args = [];
  if (loop)
    args.push("-ss", String(loop.ss), "-t", (loop.to - loop.ss).toFixed(3));
  args.push(
    "-i",
    src,
    "-an",
    "-vf",
    vf,
    "-r",
    String(fps),
    "-c:v",
    "libsvtav1",
    "-crf",
    String(crf),
    "-preset",
    "6",
    "-g",
    String(fps * 2),
    "-movflags",
    "+faststart",
    tmp,
  );
  run(args);
  const { rel, bytes } = finalize(tmp, outRel);
  const info = probe(path.join(OUT, rel.replace("/media/", "")));
  table.push([
    path.basename(rel),
    `${info.w}x${info.h}`,
    info.dur ? `${info.dur.toFixed(1)}s` : "-",
    mb(bytes),
    "AV1",
    path.basename(src),
  ]);
  return { src: rel, bytes };
}
function encAvif(src, outRel, { w, crf = 30, blur = 0 } = {}) {
  const tmp = tmpFile("avif");
  const vf = [`scale=${w}:-2:flags=lanczos`];
  if (blur > 0) vf.push(`gblur=sigma=${blur}`);
  run([
    "-i",
    src,
    "-frames:v",
    "1",
    "-vf",
    vf.join(","),
    "-c:v",
    "libsvtav1",
    "-crf",
    String(crf),
    "-f",
    "avif",
    tmp,
  ]);
  const info = probe(tmp);
  const { rel, bytes } = finalize(tmp, outRel);
  table.push([
    path.basename(rel),
    `${info.w}x${info.h}`,
    "-",
    kb(bytes),
    "AVIF",
    path.basename(src),
  ]);
  return { src: rel, w: info.w, h: info.h, bytes };
}
function encPng(src, outRel, { w } = {}) {
  // ffmpeg hier ohne libwebp -> PNG mit Alpha (fuer das transparente Logo klein genug).
  const tmp = tmpFile("png");
  run([
    "-i",
    src,
    "-frames:v",
    "1",
    "-vf",
    `scale=${w}:-2:flags=lanczos`,
    "-c:v",
    "png",
    tmp,
  ]);
  const info = probe(tmp);
  const { rel, bytes } = finalize(tmp, outRel);
  table.push([
    path.basename(rel),
    `${info.w}x${info.h}`,
    "-",
    kb(bytes),
    "PNG",
    path.basename(src),
  ]);
  return { src: rel, w: info.w, h: info.h, bytes };
}

// ---------- sources (B.11.1) ----------
const S = {
  v01: path.join(GEN, "videos/gen_v01_hero-loop_16x9.mp4"),
  v01m: path.join(GEN, "videos/gen_v01m_hero-loop_9x16.mp4"), // fehlt meist
  v03: path.join(GEN, "videos/gen_v03_haltung-nebel_16x9.mp4"),
  v04: path.join(GEN, "videos/gen_v04_kombis-clean-kurz_9x16.mp4"),
  v07: path.join(GEN, "videos/gen_v07_speedball-clean_4x5.mp4"),
  v08: path.join(GEN, "videos/gen_v08_start-seilspringen_16x9.mp4"),
  b01: pickJpg(GEN, "bilder/gen_b01_hero-leitbild_16x9"),
  b01m: pickJpg(GEN, "bilder/gen_b01m_hero-leitbild_9x16"),
  b03a: pickJpg(GEN, "bilder/gen_b03a_haltung-nebel-start_16x9"),
  b05: pickJpg(GEN, "bilder/gen_b05_coach-portrait_21x9"),
  b06: pickJpg(GEN, "bilder/gen_b06_gym-ring_16x9"),
  b08: pickJpg(GEN, "bilder/gen_b08_start-seilspringen_16x9"),
  b08m: pickJpg(GEN, "bilder/gen_b08m_start-seilspringen_9x16"),
  detailKinder: pickJpg(GEN, "bilder/detail-kinder-handschuhe"),
  detailFrauen: pickJpg(GEN, "bilder/detail-frauen-bandagen"),
  detailPreise: pickJpg(GEN, "bilder/detail-preise-hintergrund"),
  raw03: path.join(
    SRC,
    "raw/sl_raw_03_nebel-wiese-conditioning-montage_9x16.mp4",
  ),
  raw02: path.join(
    SRC,
    "raw/sl_raw_02_nebel-pfad-shadowboxing-hoodie_9x16.mp4",
  ),
  raw06: path.join(SRC, "raw/sl_raw_06_wandpolster-handschuhgewichte_9x16.mp4"),
  boxring: path.join(ROOT, "public/Boxring.jpeg"),
  refCoach: pickJpg(SRC, "reference/ref_salim_01_portrait-handwraps_hq"),
  logo: path.join(ROOT, "assets/logo.png"),
};
function pickJpg(dir, baseNoExt) {
  return pickSrc(
    path.join(dir, `${baseNoExt}.jpg`),
    path.join(dir, `${baseNoExt}.png`),
  );
}

// Gemessene Werte (Phase 4):
const HERO_UREST = [0.6, 0.37]; // Salims Gesicht in B01/V01 (UV)
const GYM_HEXAGONS = [
  // B06 Deckenleuchten (UV-Zentren, Phase 5 feinjustieren)
  [0.46, 0.25],
  [0.54, 0.25],
  [0.5, 0.31],
];

// Rueckfall-Logik: raw_03 mit LUT Nebel
const lutNebel = exists(LUT("lut_nebel.cube")) ? LUT("lut_nebel.cube") : null;
const lutSonne = exists(LUT("lut_sonne.cube")) ? LUT("lut_sonne.cube") : null;

// ---------- build ----------
function main() {
  if (CLEAN && exists(OUT)) fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  // 01 HERO
  if (S.v01) {
    registry.hero = {
      video: encVideoH264(S.v01, "hero/hero-16x9-1080.mp4", {
        w: 1920,
        crf: 21,
      }).src,
      videoAv1:
        encVideoAV1(S.v01, "hero/hero-16x9-1080.av1.mp4", { w: 1920 })?.src ??
        null,
      uRest: HERO_UREST,
    };
  }
  if (S.b01) {
    registry.hero ??= {};
    registry.hero.poster = {
      w2560: encAvif(S.b01, "hero/poster-16x9-2560.avif", { w: 2560, crf: 36 })
        .src,
      w1920: encAvif(S.b01, "hero/poster-16x9-1920.avif", { w: 1920, crf: 36 })
        .src,
      w1280: encAvif(S.b01, "hero/poster-16x9-1280.avif", { w: 1280, crf: 36 })
        .src,
    };
    registry.hero.og = encAvif(S.b01, "hero/og-1200x630.avif", {
      w: 1200,
      crf: 28,
    }).src;
  }
  // Hero mobil: Video fehlt -> Poster-Fallback
  if (!exists(S.v01m))
    warnings.push(
      "gen_v01m (Hero mobil) fehlt -> Rueckfall: Poster B01m mit Zoom (B.7).",
    );
  if (S.b01m) {
    registry.heroMobile = {
      video: exists(S.v01m)
        ? encVideoH264(S.v01m, "hero/hero-9x16-720.mp4", {
            w: 720,
            crf: 22,
            fps: 25,
          }).src
        : null,
      poster: {
        w1080: encAvif(S.b01m, "hero/poster-9x16-1080.avif", {
          w: 1080,
          crf: 30,
        }).src,
        w750: encAvif(S.b01m, "hero/poster-9x16-750.avif", { w: 750, crf: 36 })
          .src,
      },
      fallback: exists(S.v01m) ? null : "poster-zoom",
    };
  }

  // 02 HALTUNG
  if (S.v03)
    registry.haltung = {
      video: encVideoH264(S.v03, "haltung/haltung-16x9-1080.mp4", {
        w: 1920,
        crf: 21,
      }).src,
    };
  if (S.v03)
    registry.haltung.videoAv1 =
      encVideoAV1(S.v03, "haltung/haltung-16x9-1080.av1.mp4", { w: 1920 })
        ?.src ?? null;
  if (S.b03a) {
    registry.haltung ??= {};
    registry.haltung.poster = encAvif(S.b03a, "haltung/poster-16x9-1920.avif", {
      w: 1920,
      crf: 30,
    }).src;
    registry.haltung.posterBlur = encAvif(
      S.b03a,
      "haltung/poster-blur-640.avif",
      { w: 640, crf: 34, blur: 24 },
    ).src;
  }

  // 04 TECHNIK (v04: kurzer Loop + 16:10 Mini fuer LIVE-Karte)
  if (S.v04) {
    registry.technik = {
      video: encVideoH264(S.v04, "technik/kombis-9x16-720.mp4", {
        w: 720,
        crf: 23,
        fps: 30,
      }).src,
      poster: encAvif(S.v04, "technik/poster-9x16-720.avif", {
        w: 720,
        crf: 30,
      }).src, // erster Frame
      live169: encVideoH264(S.v04, "technik/live-16x10-480.mp4", {
        w: 480,
        crf: 24,
        fps: 25,
        extraVf: ["crop=in_w:in_w*10/16"],
      }).src,
    };
  }

  // 03 KURSE
  if (S.v07)
    registry.kurse = {
      personal: encVideoH264(S.v07, "kurse/personal-speedball-4x5.mp4", {
        w: 720,
        crf: 25,
        fps: 24,
      }).src,
    };
  if (S.raw03 && lutNebel) {
    // Erwachsene Shadowboxing: raw_03 13,6-17,9 s, LUT Nebel, 540x960
    registry.kurse ??= {};
    registry.kurse.erwachsene = encVideoH264(
      S.raw03,
      "kurse/erwachsene-shadowboxing-9x16.mp4",
      {
        w: 540,
        crf: 23,
        fps: 30,
        loop: { ss: 13.6, to: 17.9 },
        extraVf: [`lut3d=${lutNebel}`],
      },
    ).src;
  } else if (S.raw03)
    warnings.push("LUT Nebel fehlt -> Kurse-Erwachsene ohne Grade.");

  // 08 DEIN START
  if (S.v08) {
    registry.start = {
      video: encVideoH264(S.v08, "start/start-16x9-1080.mp4", {
        w: 1920,
        crf: 21,
      }).src,
      videoAv1:
        encVideoAV1(S.v08, "start/start-16x9-1080.av1.mp4", { w: 1920 })?.src ??
        null,
    };
  }
  if (S.b08) {
    registry.start ??= {};
    registry.start.poster = encAvif(S.b08, "start/poster-16x9-1920.avif", {
      w: 1920,
      crf: 30,
    }).src;
  }
  if (S.b08m) {
    registry.start ??= {};
    registry.start.posterMobile = encAvif(
      S.b08m,
      "start/poster-9x16-1080.avif",
      { w: 1080, crf: 36 },
    ).src;
  }
  if (S.raw03 && lutNebel) {
    // Mobil: raw_03 52,6-56,9 s Seilspringen, LUT Nebel, 720 breit
    registry.start.videoMobile = encVideoH264(
      S.raw03,
      "start/start-9x16-720.mp4",
      {
        w: 720,
        crf: 23,
        fps: 30,
        loop: { ss: 52.6, to: 56.9 },
        extraVf: [`lut3d=${lutNebel}`],
      },
    ).src;
  }

  // 05 COACH (AVIF q60 ~ crf 26)
  if (S.b05)
    registry.coach = {
      w21x9: encAvif(S.b05, "coach/coach-21x9-2560.avif", { w: 2560, crf: 32 })
        .src,
    };
  if (S.refCoach) {
    registry.coach ??= {};
    registry.coach.w4x5 = encAvif(S.refCoach, "coach/coach-4x5-1200.avif", {
      w: 1200,
      crf: 26,
    }).src;
  }

  // 06 GYM
  if (S.b06)
    registry.gym = {
      w16x9: encAvif(S.b06, "gym/gym-16x9-2560.avif", { w: 2560, crf: 32 }).src,
      hexagons: GYM_HEXAGONS,
    };
  if (S.boxring) {
    registry.gym ??= {};
    registry.gym.w4x5 = encAvif(S.boxring, "gym/gym-4x5-1200.avif", {
      w: 1200,
      crf: 26,
    }).src;
  }

  // Detailbilder (Phase 4, personenfrei)
  registry.details = {};
  if (S.detailKinder)
    registry.details.kinder = encAvif(
      S.detailKinder,
      "kurse/detail-kinder-9x16.avif",
      { w: 720, crf: 36 },
    ).src;
  if (S.detailFrauen)
    registry.details.frauen = encAvif(
      S.detailFrauen,
      "kurse/detail-frauen-9x16.avif",
      { w: 720, crf: 36 },
    ).src;
  if (S.detailPreise)
    registry.details.preise = encAvif(
      S.detailPreise,
      "preise/detail-hintergrund-21x9.avif",
      { w: 1920, crf: 32 },
    ).src;

  // Reel (B.6.11): V04, V07 + echte Clips raw_03 Box-Jump / Seilspringen, raw_02 Weggehen
  registry.reel = {};
  const reelJobs = [
    ["boxjump", S.raw03, { ss: 46.6, to: 48.9 }, lutNebel],
    ["seilspringen", S.raw03, { ss: 52.6, to: 56.9 }, lutNebel],
    ["weggehen", S.raw02, { ss: 18.8, to: 23.0 }, lutNebel],
  ];
  for (const [name, src, loop, lut] of reelJobs) {
    if (!src) continue;
    const vf = lut ? [`lut3d=${lut}`] : [];
    registry.reel[name] = encVideoH264(src, `reel/${name}-9x16-720.mp4`, {
      w: 720,
      crf: 24,
      fps: 30,
      loop,
      extraVf: vf,
    }).src;
  }

  // Logo (PNG mit Alpha; libwebp fehlt in diesem ffmpeg). Favicon-Set: Phase 5/SEO.
  if (S.logo) {
    registry.brand = {
      logo280: encPng(S.logo, "../brand/logo-white-280.png", {
        w: 280,
      }).src.replace("/media/../brand", "/brand"),
      logo560: encPng(S.logo, "../brand/logo-white-560.png", {
        w: 560,
      }).src.replace("/media/../brand", "/brand"),
    };
  }

  writeMediaTs();
  report();
}

function writeMediaTs() {
  const dir = path.join(ROOT, "content");
  fs.mkdirSync(dir, { recursive: true });
  const header =
    `// AUTO-GENERIERT von scripts/cinematic/media.mjs (Phase 4). Nicht von Hand editieren.\n` +
    `// Pfade zeigen auf public/ (Inhalts-Hash im Namen, immutable-Cache).\n\n`;
  fs.writeFileSync(
    path.join(dir, "media.ts"),
    header +
      `export const MEDIA = ${JSON.stringify(registry, null, 2)} as const;\n`,
  );
}

function report() {
  const w = [28, 11, 7, 10, 7, 34];
  const pad = (s, i) => String(s).padEnd(w[i]).slice(0, w[i]);
  console.log("\n=== Medien-Tabelle (public/media) ===");
  console.log(
    ["Datei", "Maße", "Länge", "Größe", "Codec", "Quelle"].map(pad).join(" "),
  );
  for (const r of table) console.log(r.map(pad).join(" "));
  console.log(
    `\n${table.length} Dateien. AV1: ${WANT_AV1 ? "ja" : "nein (--av1 zum Aktivieren)"}.`,
  );
  if (warnings.length) {
    console.log("\nHinweise / Rückfälle:");
    warnings.forEach((x) => console.log("  - " + x));
  }
  console.log("\ncontent/media.ts geschrieben.");
}

main();
