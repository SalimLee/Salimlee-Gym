"use client";

/**
 * Rundenmarke (B.5.3): `● RUNDE 02 — HALTUNG` als Mono-Readout, Punkt in
 * Signal-Orange. aria-hidden — die Struktur trägt die H2.
 */
export function RoundMark({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <p className={`sl-readout sl-roundmark ${className}`} aria-hidden="true">
      <span className="sl-roundmark-dot" />
      Runde {label}
    </p>
  );
}
