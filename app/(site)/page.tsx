import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { CONTACT_INFO, SITE_CONFIG } from "@/lib/constants";
import { FOOTER } from "@/content/site";

export const metadata: Metadata = {
  alternates: { canonical: SITE_CONFIG.url },
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: SITE_CONFIG.url,
    siteName: SITE_CONFIG.name,
    title: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    images: [
      {
        url: `${SITE_CONFIG.url}/og.jpg`,
        width: 1200,
        height: 630,
        alt: "Coach Salim Lee hält die Pratzen, ein Sportler schlägt eine Gerade",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    images: [`${SITE_CONFIG.url}/og.jpg`],
  },
};

/** JSON-LD (B.10) – nur belegte Daten aus lib/constants.ts. */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SportsActivityLocation",
  name: SITE_CONFIG.name,
  description: SITE_CONFIG.description,
  url: SITE_CONFIG.url,
  telephone: CONTACT_INFO.phone,
  email: CONTACT_INFO.email,
  image: `${SITE_CONFIG.url}/og.jpg`,
  address: {
    "@type": "PostalAddress",
    streetAddress: CONTACT_INFO.address.street,
    postalCode: CONTACT_INFO.address.zip,
    addressLocality: CONTACT_INFO.address.city,
    addressCountry: "DE",
  },
  openingHours: "Mo-Su 10:00-22:00",
  priceRange: "50–120 €",
  sameAs: FOOTER.socials.map((s) => s.href),
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteShell />
    </>
  );
}
