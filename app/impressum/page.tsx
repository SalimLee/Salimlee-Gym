import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Impressum',
}

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-dark-950 text-dark-50">
      {/* Header */}
      <header className="border-b border-dark-800 bg-dark-900/80">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <Link href="/" className="text-xl font-black">
            <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">SALIM LEE</span>
            <span className="text-dark-400 text-sm ml-2 font-normal">GYM</span>
          </Link>
          <Link href="/" className="text-sm text-dark-400 hover:text-brand-500 transition-colors">
            Zurueck zur Startseite
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-black mb-8">Impressum</h1>

        <div className="space-y-8 text-dark-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-dark-100 mb-3">Angaben gemaess 5 TMG</h2>
            <p>
              Salim Lee Boxing &amp; Fitness Gym<br />
              Inhaber: Saleem Fahmi Muhammad Shareef<br />
              Netzgenauerstr. 8<br />
              72764 Reutlingen
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-dark-100 mb-3">Kontakt</h2>
            <p>
              Telefon: +49 151 68457943<br />
              E-Mail: salimlee.business@gmail.com
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-dark-100 mb-3">Verantwortlich fuer den Inhalt nach 18 Abs. 2 MStV</h2>
            <p>
              Saleem Fahmi Muhammad Shareef<br />
              Netzgenauerstr. 8<br />
              72764 Reutlingen
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-dark-100 mb-3">Streitschlichtung</h2>
            <p>
              Die Europaeische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
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
            <h2 className="text-xl font-bold text-dark-100 mb-3">Haftung fuer Inhalte</h2>
            <p>
              Als Diensteanbieter sind wir gemaess 7 Abs. 1 TMG fuer eigene Inhalte auf diesen Seiten nach den
              allgemeinen Gesetzen verantwortlich. Nach den 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht
              verpflichtet, uebermittelte oder gespeicherte fremde Informationen zu ueberwachen oder nach Umstaenden zu
              forschen, die auf eine rechtswidrige Taetigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der
              Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberuehrt. Eine diesbezuegliche
              Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung moeglich. Bei
              Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-dark-100 mb-3">Haftung fuer Links</h2>
            <p>
              Unser Angebot enthaelt Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben.
              Deshalb koennen wir fuer diese fremden Inhalte auch keine Gewaehr uebernehmen. Fuer die Inhalte der
              verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten
              Seiten wurden zum Zeitpunkt der Verlinkung auf moegliche Rechtsverstoesse ueberprueft. Rechtswidrige Inhalte
              waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten
              Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von
              Rechtsverletzungen werden wir derartige Links umgehend entfernen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-dark-100 mb-3">Urheberrecht</h2>
            <p>
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen
              Urheberrecht. Die Vervielfaeltigung, Bearbeitung, Verbreitung und jede Art der Verwertung ausserhalb der
              Grenzen des Urheberrechtes beduerfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
              Downloads und Kopien dieser Seite sind nur fuer den privaten, nicht kommerziellen Gebrauch gestattet.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
