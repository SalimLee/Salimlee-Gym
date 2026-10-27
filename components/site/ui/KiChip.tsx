"use client";

import { UI } from "@/content/site";

/**
 * KI-Kennzeichnung (B.5.6, AI Act Art. 50 Abs. 4): sichtbarer Chip an jedem
 * Medium, das mit KI erzeugt oder erweitert wurde. Sichtbar beim ersten Kontakt,
 * nicht erst bei Hover.
 */
export function KiChip({ className = "" }: { className?: string }) {
  return (
    <span className={`sl-chip sl-ki-chip sl-readout ${className}`}>
      {UI.aiChip}
    </span>
  );
}
