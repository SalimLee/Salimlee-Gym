import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalShell } from '@/components/site/LegalShell'

export const metadata: Metadata = {
  title: 'Impressum',
}

export default function ImpressumPage() {
  return (
    <LegalShell>

      <main className="sl-legal sl-wrap">
        <h1 className="text-3xl font-black mb-8">Impressum</h1>

        <div className="space-y-8 text-dark-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-dark-100 mb-3">Angaben gemäß § 5 DDG</h2>
            <p>
              Salim Lee Boxing &amp; Fitness Gym<br />
              Inhaber: Saleem Fahmi Muhammad Shareef<br />
              Wörthstrasse 17<br />
              72764 Reutlingen
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-dark-100 mb-3">Kontakt</h2>
            <p>
              Telefon: +49 151 68457943<br />
              E-Mail: info@salimlee-gym.de
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-dark-100 mb-3">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
            <p>
              Saleem Fahmi Muhammad Shareef<br />
              Wörthstrasse 17<br />
              72764 Reutlingen
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-dark-100 mb-3">Streitschlichtung</h2>
            <p>
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
              <a
                href="https://ec.europa.eu/consumers/odr/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-500 hover:underline"
              >
                https://ec.europa.eu/consumers/odr/
              </a>
            </p>
            <p className="mt-2">
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-dark-100 mb-3">Haftung für Inhalte</h2>
            <p>
              Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach den
              allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht
              verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu
              forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der
              Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche
              Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei
              Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-dark-100 mb-3">Haftung für Links</h2>
            <p>
              Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben.
              Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der
              verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten
              Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte
              waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten
              Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von
              Rechtsverletzungen werden wir derartige Links umgehend entfernen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-dark-100 mb-3">Urheberrecht</h2>
            <p>
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen
              Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der
              Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
              Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet.
            </p>
          </section>
        </div>
      </main>
    </LegalShell>
  )
}
