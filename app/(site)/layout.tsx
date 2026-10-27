import localFont from "next/font/local";
import "./site.css";
import { SmoothScroll } from "@/components/site/motion/SmoothScroll";
import { CursorDot } from "@/components/site/ui/CursorDot";
import { Grain } from "@/components/site/ui/Grain";
import { UI } from "@/content/site";

/**
 * Schrift: Barlow, ausschließlich lokal aus `public/fonts/barlow`. Eine Familie
 * für Schlagzeilen und Fließtext — Barlow ist die Schrift der Marke und eine
 * echte Sportschrift. Kein Monospace, keine Google Fonts, kein CDN.
 * Über next/font, damit die Dateien vorgeladen werden (sonst kostet es ~0,8 s FCP).
 */
const barlow = localFont({
  src: [
    { path: "../../public/fonts/barlow/barlow-400.woff2", weight: "400" },
    { path: "../../public/fonts/barlow/barlow-500.woff2", weight: "500" },
    { path: "../../public/fonts/barlow/barlow-600.woff2", weight: "600" },
    { path: "../../public/fonts/barlow/barlow-700.woff2", weight: "700" },
    { path: "../../public/fonts/barlow/barlow-900.woff2", weight: "900" },
  ],
  variable: "--font-sl",
  display: "swap",
});

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${barlow.variable} sl-site`}>
      <a href="#inhalt" className="sl-skip">
        {UI.skip}
      </a>
      <SmoothScroll />
      <CursorDot />
      {children}
      <Grain />
    </div>
  );
}
