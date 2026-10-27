/**
 * Buchungs-Logik (B.6.10) — bewusst ohne React, damit sie testbar ist.
 *
 * Schema, Optionen und der `service`-String sind 1:1 aus dem alten
 * components/sections/BookingModal.tsx übernommen. Der Request an
 * /api/booking bleibt damit für alle bisherigen Kombinationen byte-identisch.
 *
 * Einzige freigegebene Erweiterung (Karahan, 27.10.2026): „Frauenkurse" ist
 * eine echte Kurs-Option. Der Admin sieht sie entsprechend im service-Text.
 * Frauenkurse sind ein Erwachsenenkurs ohne eigenen Preis und nutzen deshalb
 * dieselben Mitgliedschafts-Optionen wie die Erwachsenenkurse.
 */
import { z } from "zod";

export const COURSES = [
  { id: "personal", label: "Personaltraining" },
  { id: "group", label: "Erwachsenenkurse" },
  { id: "frauen", label: "Frauenkurse" },
  { id: "kids", label: "Kinderkurse" },
] as const;

export const TRIAL_COURSES = [
  { id: "personal", label: "Personaltraining (einmalig 40€)" },
  { id: "group", label: "Erwachsenenkurse (kostenlos, max. 2 Kurse)" },
  { id: "frauen", label: "Frauenkurse (kostenlos, max. 2 Kurse)" },
  { id: "kids", label: "Kinderkurse (kostenlos, max. 2 Kurse)" },
] as const;

export const MEMBERSHIP_OPTIONS: Record<
  string,
  { value: string; label: string }[]
> = {
  Personaltraining: [
    { value: "Einzelstunde (60€)", label: "Einzelstunde (60€)" },
    { value: "10er Karte (Auf Anfrage)", label: "10er Karte (Vorauszahlung)" },
  ],
  Erwachsenenkurse: [
    { value: "6 Monate (90€/mtl.)", label: "6 Monate (90€/mtl.)" },
    { value: "12 Monate (80€/mtl.)", label: "12 Monate (80€/mtl.)" },
    {
      value: "Monatlich kündbar (120€/mtl.)",
      label: "Monatlich kündbar (120€/mtl.)",
    },
    {
      value: "10er Karte (160€)",
      label: "10er Karte – 6 Monate gültig (160€)",
    },
  ],
  Frauenkurse: [
    { value: "6 Monate (90€/mtl.)", label: "6 Monate (90€/mtl.)" },
    { value: "12 Monate (80€/mtl.)", label: "12 Monate (80€/mtl.)" },
    {
      value: "Monatlich kündbar (120€/mtl.)",
      label: "Monatlich kündbar (120€/mtl.)",
    },
    {
      value: "10er Karte (160€)",
      label: "10er Karte – 6 Monate gültig (160€)",
    },
  ],
  Kinderkurse: [
    { value: "12 Monate (50€/mtl.)", label: "12 Monate (50€/mtl.)" },
  ],
};

export const bookingSchema = z
  .object({
    name: z.string().min(2, "Name muss mindestens 2 Zeichen lang sein"),
    email: z.string().email("Bitte gültige E-Mail eingeben"),
    phone: z.string().optional(),
    intent: z.string().min(1, "Bitte Anliegen auswählen"),
    course: z.string().min(1, "Bitte Kurs auswählen"),
    membership: z.string().optional(),
    date: z.string().optional(),
    message: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.intent === "mitgliedschaft" && !data.membership) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bitte Mitgliedschaft auswählen",
        path: ["membership"],
      });
    }
  });

export type BookingFormValues = z.infer<typeof bookingSchema>;

/** Anzeigename des Anliegens — exakt wie bisher. */
export function intentLabel(intent: string): string {
  return intent === "probetraining"
    ? "Probetraining"
    : "Mitgliedschaft anfragen";
}

/** `service`-String, den der Admin sieht — exakt wie bisher. */
export function buildService(
  data: Pick<BookingFormValues, "intent" | "course" | "membership">,
) {
  const label = intentLabel(data.intent);
  return data.membership
    ? `${label} – ${data.course} – ${data.membership}`
    : `${label} – ${data.course}`;
}

/** Body für POST /api/booking — Feldreihenfolge und -auswahl wie bisher. */
export function buildBookingPayload(data: BookingFormValues) {
  return {
    name: data.name,
    email: data.email,
    phone: data.phone,
    service: buildService(data),
    date: data.date,
    message: data.message,
  };
}

/** Wert, den die Kurs-Auswahl in das Formular schreibt (Label ohne Klammer-Zusatz). */
export function courseValue(label: string): string {
  return label.split(" (")[0];
}
