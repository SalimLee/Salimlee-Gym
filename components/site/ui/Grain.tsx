"use client";

/**
 * Korn (B.4.3): SVG-feTurbulence, 4 % Deckkraft, mix-blend overlay, fixiert,
 * Versatz mit ~8 fps. Liegt über allem außer Formularfeldern (z-index unter Dialogen).
 */
export function Grain() {
  return (
    <div className="sl-grain" aria-hidden="true">
      <svg width="100%" height="100%">
        <filter id="sl-grain-filter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves={3}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#sl-grain-filter)" />
      </svg>
    </div>
  );
}
