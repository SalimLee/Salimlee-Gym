import localFont from "next/font/local";
import "./site.css";
import { SmoothScroll } from "@/components/site/motion/SmoothScroll";
import { CursorDot } from "@/components/site/ui/CursorDot";
import { Grain } from "@/components/site/ui/Grain";
import { UI } from "@/content/site";

/**
 * Schriften ausschließlich lokal (B.2 / Teil A): Geist für alles, Geist Mono für
 * die technischen Readouts. Keine Google Fonts, kein CDN, kein next/font/google.
 */
const geist = localFont({
  src: "./fonts/Geist-Variable.woff2",
  variable: "--font-sl",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMono-Variable.woff2",
  variable: "--font-sl-mono",
  weight: "100 900",
  display: "swap",
});

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${geist.variable} ${geistMono.variable} sl-site`}>
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
