import { LIVE, OPENING, SCHEDULE, type ScheduleEntry } from "@/content/site";

const DAY_NAMES = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const TZ = "Europe/Berlin";

export type LiveRow = { label: string; value: string; unit?: string };
export type LiveState = {
  /** Punkt pulsiert nur, wenn gerade ein Kurs läuft (B.6.1) */
  running: boolean;
  rows: LiveRow[];
};

/** Aktuelle Zeit in Europe/Berlin als {day, minutes}. */
export function berlinNow(now: Date = new Date()): {
  day: number;
  minutes: number;
} {
  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wd = get("weekday").replace(".", "");
  const day = Math.max(0, DAY_NAMES.indexOf(wd));
  const minutes = parseInt(get("hour"), 10) * 60 + parseInt(get("minute"), 10);
  return { day, minutes };
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Nächster Kurs ab (day, minutes), bis zu 7 Tage voraus. */
function nextCourse(
  day: number,
  minutes: number,
): { entry: ScheduleEntry; inDays: number } | null {
  for (let offset = 0; offset < 8; offset++) {
    const d = (day + offset) % 7;
    const candidates = SCHEDULE.filter((e) => e.day === d)
      .filter((e) => offset > 0 || toMin(e.start) > minutes)
      .sort((a, b) => toMin(a.start) - toMin(b.start));
    if (candidates.length) return { entry: candidates[0], inDays: offset };
  }
  return null;
}

/**
 * Leitet die drei Zeilen der LIVE-Karte aus dem Stundenplan ab (B.6.1).
 * Vier Situationen: Kurs läuft · geöffnet, Kurs später · geöffnet, kein Kurs mehr · geschlossen.
 */
export function getLiveState(now: Date = new Date()): LiveState {
  const { day, minutes } = berlinNow(now);
  const open = minutes >= toMin(OPENING.start) && minutes < toMin(OPENING.end);

  const current = SCHEDULE.find(
    (e) => e.day === day && minutes >= toMin(e.start) && minutes < toMin(e.end),
  );

  if (open && current) {
    return {
      running: true,
      rows: [
        { label: LIVE.running, value: current.name },
        { label: LIVE.until, value: current.end },
        { label: LIVE.open, value: LIVE.openUntil },
      ],
    };
  }

  const next = nextCourse(day, minutes);

  if (open) {
    const value = next
      ? next.inDays === 0
        ? next.entry.name
        : `${DAY_NAMES[next.entry.day]} · ${next.entry.name}`
      : "–";
    return {
      running: false,
      rows: [
        { label: LIVE.next, value },
        { label: LIVE.begins, value: next ? next.entry.start : "–" },
        { label: LIVE.open, value: LIVE.openUntil },
      ],
    };
  }

  // Geschlossen (22:00–10:00)
  const value = next
    ? `${DAY_NAMES[next.entry.day]} · ${next.entry.name}`
    : "–";
  return {
    running: false,
    rows: [
      { label: LIVE.opens, value: OPENING.start },
      { label: LIVE.next, value },
      { label: LIVE.trial, value: LIVE.free },
    ],
  };
}
