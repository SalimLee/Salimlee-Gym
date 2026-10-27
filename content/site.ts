/**
 * content/site.ts — typisierte Inhalte der Cinematic-Landingpage.
 * Quellen: lib/constants.ts und die alten components/sections/*.
 * Neu ist ausschließlich, was in docs/CINEMATIC.md B.14 steht und freigegeben wurde
 * (siehe docs/CINEMATIC-BRIEF.md). Keine erfundenen Zahlen, Bewertungen oder Zitate.
 */
import { CONTACT_INFO, PRICES, SERVICES, STATS } from "@/lib/constants";

export const ROUNDS = {
  hero: "01 — FOKUS",
  haltung: "02 — HALTUNG",
  kurse: "03 — KURSE",
  technik: "04 — TECHNIK",
  coach: "05 — COACH",
  gym: "06 — DAS GYM",
  preise: "07 — PREISE",
  start: "08 — DEIN START",
} as const;

export const NAV = {
  links: [
    { href: "#angebote", label: "Angebote" },
    { href: "#about", label: "Über mich" },
    { href: "#preise", label: "Preise" },
    { href: "#kontakt", label: "Kontakt" },
  ],
  cta: "Jetzt buchen",
  menu: "Menü",
  /** Rundenuhr als Status-Readout (Freigabe 27.10.2026) */
  roundClock: true,
} as const;

/** Runde 01 — Hero (Variante „Weit") */
export const HERO = {
  eyebrowDesktop: "⊙ Beweg dich – der Fokus folgt",
  eyebrowTouch: "⊙ Reutlingen · Boxen & Fitness",
  h1: ["Dein Ring.", "Dein Kampf."],
  lead: "Boxen & Fitness, Kraft & Ausdauer, Selbstvertrauen & Disziplin. Alle Level willkommen.",
  primary: "Jetzt buchen",
  secondary: "Film ansehen",
  facts: [
    {
      icon: "pin",
      text: `${CONTACT_INFO.address.street}, ${CONTACT_INFO.address.city}`,
    },
    { icon: "star", text: "Probetraining kostenlos" },
  ],
  alt: "Coach Salim Lee hält die Pratzen, ein Sportler schlägt eine Gerade, Sportplatz in Reutlingen",
} as const;

/** LIVE-Karte (B.6.1) */
export const LIVE = {
  title: "Live im Gym",
  running: "Läuft gerade",
  next: "Nächster Kurs",
  begins: "Beginn",
  until: "bis",
  open: "Geöffnet",
  openUntil: "bis 22:00",
  opens: "Öffnet",
  trial: "Probetraining",
  free: "kostenlos",
} as const;

/** Stundenplan (Europe/Berlin). day: 0 = So … 6 = Sa. Quelle: KurseInfos. */
export type ScheduleEntry = {
  day: number;
  start: string;
  end: string;
  name: string;
};
export const SCHEDULE: ScheduleEntry[] = [
  ...[1, 3, 5].flatMap((day) => [
    { day, start: "17:00", end: "19:00", name: "Freies Training" },
    { day, start: "19:00", end: "20:00", name: "Erwachsenenkurse" },
  ]),
  ...[2, 4].flatMap((day) => [
    { day, start: "17:00", end: "18:00", name: "Kinderkurse" },
    { day, start: "18:30", end: "19:30", name: "Frauenkurse" },
  ]),
];
/** Öffnungszeiten: täglich 10:00–22:00 (Freigabe 26.10.2026) */
export const OPENING = { start: "10:00", end: "22:00" } as const;

/** Runde 02 — Haltung */
export const HALTUNG = {
  words: ["Motivation.", "Respekt.", "Erfolg."],
  closing:
    "Disziplin, saubere Technik und der unverzichtbare Spaß an der Bewegung.",
} as const;

/** Runde 03 — Kurse */
export const KURSE = {
  h2: "Kurse",
  note: "Bitte 15 Minuten vor Kursbeginn da sein, damit wir pünktlich starten können.",
  cta: "Probetraining buchen",
  lanes: [
    {
      id: "erwachsene",
      label: "Erwachsenenkurse",
      times: "MO, MI & FR · Kurs 19:00–20:00 · Freies Training 17:00–19:00",
      price: "ab 80 €/mtl.",
      features: [
        "Boxen & Fitness",
        "Motivierende Atmosphäre",
        "Probetraining kostenlos",
      ],
      preselect: { intent: "probetraining", course: "Erwachsenenkurse" },
    },
    {
      id: "frauen",
      label: "Frauenkurse",
      times: "DI & DO · 18:30–19:30",
      price: "",
      features: ["Boxen & Fitness", "Eigene Gruppe", "Probetraining kostenlos"],
      preselect: { intent: "probetraining", course: "Frauenkurse" },
    },
    {
      id: "kinder",
      label: "Kinderkurse (3–14 Jahre)",
      times: "DI & DO · 17:00–18:00",
      price: "ab 50 €/mtl.",
      features: [
        "Spielerisches Training",
        "Selbstvertrauen aufbauen",
        "Probetraining kostenlos",
      ],
      preselect: { intent: "probetraining", course: "Kinderkurse" },
    },
    {
      id: "boxtraining",
      label: "Boxtraining",
      times: "Technik, Sparring & Fitness",
      price: "",
      features: ["Technik", "Sparring", "Fitness"],
      preselect: { intent: "probetraining", course: "Erwachsenenkurse" },
    },
    {
      id: "personal",
      label: "Personal Training",
      times: "Flexible Termine nach Absprache · 1–4 Personen",
      price: "60 €/Std.",
      features: [
        "Individuelle Betreuung",
        "Flexible Zeiten",
        "10er Karte verfügbar",
      ],
      preselect: { intent: "probetraining", course: "Personaltraining" },
    },
  ],
} as const;

/** Runde 04 — Technik */
export const TECHNIK = {
  h2: "Boxtraining",
  lead: "Technik, Sparring & Fitness",
  punches: ["Jab", "Hook", "Right Slip", "Roll Back", "Cross", "Uppercut"],
  pillars: [
    "Boxen & Fitness",
    "Kraft & Ausdauer",
    "Selbstvertrauen & Disziplin",
    "Alle Level willkommen",
  ],
} as const;

/** Runde 05 — Coach (Texte aus About.tsx) */
export const COACH = {
  eyebrow: "Über mich",
  h2: "Salim Lee",
  paragraphs: [
    "Hallo, ich bin Salim Lee, dein Trainer für professionelles Boxen und Fitness in Reutlingen.",
    "Mit jahrelanger Erfahrung im Boxen und im Bereich der physischen Fitness ist es meine Leidenschaft, Menschen dabei zu helfen, ihre sportlichen Ziele zu erreichen – egal ob Du kompletter Anfänger bist oder bereits Erfahrung mitbringst.",
    "In meinem Training setze ich auf Disziplin, saubere Technik und den unverzichtbaren Spaß an der Bewegung. Mein Ziel ist es nicht nur, dass Du körperlich spürbar fitter wirst, sondern auch echtes Selbstvertrauen aufbaust und im Alltag über dich hinauswächst.",
  ],
  closing: "Lass uns gemeinsam anpacken!",
  stats: STATS,
} as const;

/** Runde 06 — Das Gym */
export const GYM = {
  h2: "Dein Ring.",
  facts: [
    `${CONTACT_INFO.address.street}, ${CONTACT_INFO.address.zip} ${CONTACT_INFO.address.city}`,
    CONTACT_INFO.hours.weekdays,
    "Bitte 15 Minuten vor Kursbeginn da sein.",
  ],
} as const;

/** Runde 07 — Preise */
export const PREISE = {
  h2: "Unsere Preise",
  lead: "Transparente Preise ohne versteckte Kosten",
  cta: "Anfragen",
  serviceNote: "zzgl. 30 € halbjährliche Service Pauschale",
  footnote:
    "* Alle Preise inkl. MwSt. Kurszeiten: Erwachsene MO, MI & FR – Kurs 19:00–20:00, freies Training 17:00–19:00 · Kinder DI & DO – 17:00–18:00.",
  tabs: [
    { id: "membership", label: "Mitgliedschaft (Kurse)" },
    { id: "personal", label: "Personaltraining" },
    { id: "trial", label: "Probetraining" },
  ],
  items: PRICES,
} as const;

/** Runde 08 — Dein Start */
export const START = {
  h1: ["Probetraining", "kostenlos."],
  lines: [
    "Unverbindlich reinschnuppern (max. 2 Kurse).",
    "Jetzt starten – einfach vorbeikommen oder anrufen.",
  ],
  primary: "Jetzt buchen",
  secondary: "Anrufen",
} as const;

/** Kontakt & Standort */
export const KONTAKT = {
  h2: "Kontakt & Standort",
  cards: {
    address: "Adresse",
    phone: "Telefon",
    email: "E-Mail",
    hours: "Öffnungszeiten",
  },
  maps: {
    title: "Google Maps",
    // Umlaute korrigiert (B.14)
    note: "Beim Laden der Karte werden Daten an Google (USA) übermittelt. Mehr dazu in unserer",
    linkLabel: "Datenschutzerklärung",
    button: "Karte laden",
  },
  info: CONTACT_INFO,
} as const;

export const FOOTER = {
  marquee: "Train hard · Stay strong ·",
  motto: ["Motivation", "Respekt", "Erfolg"],
  socials: [
    { label: "Instagram", href: "https://www.instagram.com/salimleegym/" },
    { label: "TikTok", href: "https://www.tiktok.com/@leesalim1" },
    { label: "YouTube", href: "https://youtube.com/@salimlee1378" },
  ],
  legal: [
    { href: "/impressum", label: "Impressum" },
    { href: "/datenschutz", label: "Datenschutz" },
  ],
  /** KI-Kennzeichnung (AI Act Art. 50 Abs. 4) */
  aiNote:
    "Einzelne Bilder und Videos auf dieser Seite wurden mit KI-Unterstützung bearbeitet.",
} as const;

export const UI = {
  skip: "Zum Inhalt springen",
  aiChip: "KI-bearbeitet",
} as const;

export const SERVICES_BY_ID = Object.fromEntries(
  SERVICES.map((s) => [s.id, s]),
);
