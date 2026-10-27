"use client";

import { useState } from "react";
import { KONTAKT } from "@/content/site";

const MAPS_SRC =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2634.5!2d9.2048!3d48.4912!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4799e9a3c9d3b7f7%3A0x0!2sW%C3%B6rthstra%C3%9Fe+17%2C+72764+Reutlingen!5e0!3m2!1sde!2sde";

/**
 * Kontakt & Standort (B.6.8): vier Glaskarten und die Karte erst nach
 * Zustimmung (Google lädt nichts vorher). Texte wie bisher, nur die Umlaute
 * sind korrigiert (B.14).
 */
export function Kontakt() {
  const [consent, setConsent] = useState(false);
  const info = KONTAKT.info;
  const tel = info.phone.replace(/\s/g, "");

  const cards = [
    {
      title: KONTAKT.cards.address,
      body: (
        <>
          {info.address.street}
          <br />
          {info.address.zip} {info.address.city}
          <br />
          {info.address.country}
        </>
      ),
    },
    {
      title: KONTAKT.cards.phone,
      body: <a href={`tel:${tel}`}>{info.phone}</a>,
    },
    {
      title: KONTAKT.cards.email,
      body: <a href={`mailto:${info.email}`}>{info.email}</a>,
    },
    {
      title: KONTAKT.cards.hours,
      body: (
        <>
          {info.hours.weekdays}
          {info.hours.weekend ? (
            <>
              <br />
              {info.hours.weekend}
            </>
          ) : null}
        </>
      ),
    },
  ];

  return (
    <section
      id="kontakt"
      className="sl-section sl-kontakt"
      aria-labelledby="sl-kontakt-h2"
    >
      <div className="sl-wrap">
        <h2 id="sl-kontakt-h2" className="sl-display-lg">
          {KONTAKT.h2}
        </h2>

        <div className="sl-kontakt-grid">
          <div className="sl-kontakt-cards">
            {cards.map((c) => (
              <div key={c.title} className="sl-kontakt-card sl-glass">
                <h3 className="sl-readout sl-kontakt-card-title">{c.title}</h3>
                <div className="sl-kontakt-card-body">{c.body}</div>
              </div>
            ))}
          </div>

          <div className="sl-kontakt-map sl-glass">
            {consent ? (
              <iframe
                src={MAPS_SRC}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Standort Salim Lee Gym"
              />
            ) : (
              <div className="sl-kontakt-consent">
                <h3 className="sl-kontakt-consent-title">
                  {KONTAKT.maps.title}
                </h3>
                <p className="sl-kontakt-consent-note">
                  {KONTAKT.maps.note}{" "}
                  <a href="/datenschutz">{KONTAKT.maps.linkLabel}</a>.
                </p>
                <button
                  type="button"
                  className="sl-btn sl-btn-primary"
                  onClick={() => setConsent(true)}
                >
                  {KONTAKT.maps.button}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
