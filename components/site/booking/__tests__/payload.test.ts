/**
 * Prüft, dass der Request an /api/booking für alle bisherigen Kombinationen
 * byte-identisch zum alten components/sections/BookingModal.tsx bleibt (B.6.10).
 * `fetch` ist gemockt — es wird nie eine echte Buchung abgeschickt.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  COURSES,
  MEMBERSHIP_OPTIONS,
  TRIAL_COURSES,
  buildBookingPayload,
  buildService,
  courseValue,
} from "../payload";

/** Referenz: die Logik des ALTEN BookingModal, wortgleich nachgebildet. */
function legacyService(data: {
  intent: string;
  course: string;
  membership?: string;
}) {
  const intentLabel =
    data.intent === "probetraining"
      ? "Probetraining"
      : "Mitgliedschaft anfragen";
  return data.membership
    ? `${intentLabel} – ${data.course} – ${data.membership}`
    : `${intentLabel} – ${data.course}`;
}
function legacyBody(d: {
  name: string;
  email: string;
  phone?: string;
  intent: string;
  course: string;
  membership?: string;
  date?: string;
  message?: string;
}) {
  return {
    name: d.name,
    email: d.email,
    phone: d.phone,
    service: legacyService(d),
    date: d.date,
    message: d.message,
  };
}

/** Kurse, die es schon vor dem Redesign gab. */
const LEGACY_COURSES = ["Personaltraining", "Erwachsenenkurse", "Kinderkurse"];

const base = {
  name: "Max Mustermann",
  email: "max@example.de",
  phone: "+49 123 456789",
  date: "2026-11-03",
  message: "Kurze Nachricht",
};

describe("service-String", () => {
  it("bleibt für alle Probetraining-Kombinationen identisch zum alten Modal", () => {
    for (const course of LEGACY_COURSES) {
      const data = { ...base, intent: "probetraining", course };
      expect(buildService(data)).toBe(legacyService(data));
    }
  });

  it("bleibt für alle Mitgliedschaft-Kombinationen identisch zum alten Modal", () => {
    for (const course of LEGACY_COURSES) {
      for (const m of MEMBERSHIP_OPTIONS[course] ?? []) {
        const data = {
          ...base,
          intent: "mitgliedschaft",
          course,
          membership: m.value,
        };
        expect(buildService(data)).toBe(legacyService(data));
      }
    }
  });

  it("lässt die Mitgliedschaft weg, wenn keine gewählt ist", () => {
    const data = { ...base, intent: "probetraining", course: "Kinderkurse" };
    expect(buildService(data)).toBe("Probetraining – Kinderkurse");
  });
});

describe("Request-Body", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ success: true }) })),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("ist für alle Alt-Kombinationen byte-identisch", () => {
    for (const course of LEGACY_COURSES) {
      for (const intent of ["probetraining", "mitgliedschaft"]) {
        const memberships =
          intent === "mitgliedschaft"
            ? (MEMBERSHIP_OPTIONS[course] ?? [])
            : [null];
        for (const m of memberships) {
          const data = { ...base, intent, course, membership: m?.value };
          expect(JSON.stringify(buildBookingPayload(data))).toBe(
            JSON.stringify(legacyBody(data)),
          );
        }
      }
    }
  });

  it("schickt nichts ab — fetch wurde nur gemockt, nie aufgerufen", () => {
    buildBookingPayload({
      ...base,
      intent: "probetraining",
      course: "Erwachsenenkurse",
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("Frauenkurse (freigegebene Erweiterung 27.10.2026)", () => {
  it("ist als echte Kurs-Option vorhanden — zusätzlich, nicht ersetzend", () => {
    const labels = COURSES.map((c) => c.label);
    expect(labels).toContain("Frauenkurse");
    for (const legacy of LEGACY_COURSES) expect(labels).toContain(legacy);
    expect(TRIAL_COURSES.map((c) => courseValue(c.label))).toContain(
      "Frauenkurse",
    );
  });

  it("erzeugt den erwarteten service-Text", () => {
    expect(
      buildService({ intent: "probetraining", course: "Frauenkurse" }),
    ).toBe("Probetraining – Frauenkurse");
  });

  it("nutzt die Mitgliedschaften der Erwachsenenkurse (kein eigener Preis)", () => {
    expect(MEMBERSHIP_OPTIONS["Frauenkurse"]).toEqual(
      MEMBERSHIP_OPTIONS["Erwachsenenkurse"],
    );
  });
});

describe("courseValue", () => {
  it("schneidet den Klammer-Zusatz ab, wie die alte Auswahl", () => {
    expect(courseValue("Erwachsenenkurse (kostenlos, max. 2 Kurse)")).toBe(
      "Erwachsenenkurse",
    );
    expect(courseValue("Personaltraining (einmalig 40€)")).toBe(
      "Personaltraining",
    );
  });
});
