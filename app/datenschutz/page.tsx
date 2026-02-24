import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Datenschutzerklaerung',
}

export default function DatenschutzPage() {
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
        <h1 className="text-3xl font-black mb-8">Datenschutzerklaerung</h1>

        <div className="space-y-8 text-dark-300 leading-relaxed">
          {/* 1. Verantwortlicher */}
          <section>
            <h2 className="text-xl font-bold text-dark-100 mb-3">1. Verantwortlicher</h2>
            <p>
              Salim Lee Boxing &amp; Fitness Gym<br />
              Inhaber: Saleem Fahmi Muhammad Shareef<br />
              Netzgenauerstr. 8<br />
              72764 Reutlingen<br />
              E-Mail: salimlee.business@gmail.com<br />
              Telefon: +49 151 68457943
            </p>
          </section>

          {/* 2. Allgemeines */}
          <section>
            <h2 className="text-xl font-bold text-dark-100 mb-3">2. Allgemeines zur Datenverarbeitung</h2>
            <p>
              Wir nehmen den Schutz Ihrer persoenlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten
              vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklaerung.
              Die Nutzung unserer Website ist in der Regel ohne Angabe personenbezogener Daten moeglich.
            </p>
          </section>

          {/* 3. Hosting */}
          <section>
            <h2 className="text-xl font-bold text-dark-100 mb-3">3. Hosting</h2>
            <p>
              Unsere Website wird bei <strong className="text-dark-100">Vercel Inc.</strong> (440 N Barranca Ave #4133,
              Covina, CA 91723, USA) gehostet. Beim Besuch unserer Website werden automatisch Informationen in sogenannten
              Server-Log-Dateien gespeichert, die Ihr Browser automatisch an uns uebermittelt. Dies sind: Browsertyp und
              -version, verwendetes Betriebssystem, Referrer URL, Hostname des zugreifenden Rechners, Uhrzeit der
              Serveranfrage und IP-Adresse.
            </p>
            <p className="mt-2">
              Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der sicheren Bereitstellung der Website).
            </p>
          </section>

          {/* 4. Google Maps */}
          <section>
            <h2 className="text-xl font-bold text-dark-100 mb-3">4. Google Maps</h2>
            <p>
              Diese Website nutzt den Kartendienst <strong className="text-dark-100">Google Maps</strong> der Google Ireland
              Limited (&quot;Google&quot;), Gordon House, Barrow Street, Dublin 4, Irland. Die Karte wird erst nach Ihrer
              ausdruecklichen Einwilligung geladen (Klick auf &quot;Karte laden&quot;).
            </p>
            <p className="mt-2">
              Durch das Laden der Karte erhaelt Google Kenntnis darueber, dass Sie die entsprechende Unterseite unserer
              Website aufgerufen haben. Zudem werden Ihre IP-Adresse sowie weitere technische Daten an Google uebermittelt.
              Dies geschieht unabhaengig davon, ob Google ein Nutzerkonto bereitstellt, ueber das Sie eingeloggt sind, oder
              ob kein Nutzerkonto besteht.
            </p>
            <p className="mt-2">
              Google kann Ihre Daten in die USA uebertragen. Google hat sich dem EU-US Data Privacy Framework
              unterworfen. Weitere Informationen finden Sie in der{' '}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-500 hover:underline"
              >
                Datenschutzerklaerung von Google
              </a>.
            </p>
            <p className="mt-2">
              Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung). Sie koennen die Einwilligung jederzeit
              widerrufen, indem Sie die Seite neu laden.
            </p>
          </section>

          {/* 5. Kontaktformular */}
          <section>
            <h2 className="text-xl font-bold text-dark-100 mb-3">5. Kontaktformular / Buchungsanfragen</h2>
            <p>
              Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben (Name, E-Mail, Telefon,
              Nachricht) zum Zwecke der Bearbeitung der Anfrage und fuer den Fall von Anschlussfragen bei uns
              gespeichert. Diese Daten geben wir nicht ohne Ihre Einwilligung weiter.
            </p>
            <p className="mt-2">
              Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Massnahmen).
            </p>
          </section>

          {/* 6. E-Mail-Versand */}
          <section>
            <h2 className="text-xl font-bold text-dark-100 mb-3">6. E-Mail-Versand (Resend)</h2>
            <p>
              Fuer den Versand von E-Mails (z.B. Vertragsbestaetigung, Buchungsbestaetigung) nutzen wir den Dienst{' '}
              <strong className="text-dark-100">Resend</strong> (Resend Inc., USA). Dabei werden die fuer den Versand
              notwendigen Daten (E-Mail-Adresse, Name) an Resend uebermittelt.
            </p>
            <p className="mt-2">
              Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragsdurchfuehrung).
            </p>
          </section>

          {/* 7. Datenbank */}
          <section>
            <h2 className="text-xl font-bold text-dark-100 mb-3">7. Datenbank (Supabase)</h2>
            <p>
              Zur Speicherung von Mitgliederdaten, Buchungen und Vertragsinformationen nutzen wir{' '}
              <strong className="text-dark-100">Supabase</strong> (Supabase Inc., USA). Die Daten werden verschluesselt
              gespeichert und sind nur fuer autorisierte Administratoren zugaenglich.
            </p>
            <p className="mt-2">
              Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragsdurchfuehrung) und Art. 6 Abs. 1 lit. f DSGVO
              (berechtigtes Interesse an der Verwaltung der Mitgliedschaften).
            </p>
          </section>

          {/* 8. Ihre Rechte */}
          <section>
            <h2 className="text-xl font-bold text-dark-100 mb-3">8. Ihre Rechte</h2>
            <p>Sie haben gegenueber uns folgende Rechte hinsichtlich der Sie betreffenden personenbezogenen Daten:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
              <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
              <li>Recht auf Loeschung (Art. 17 DSGVO)</li>
              <li>Recht auf Einschraenkung der Verarbeitung (Art. 18 DSGVO)</li>
              <li>Recht auf Datenuebertragbarkeit (Art. 20 DSGVO)</li>
              <li>Recht auf Widerspruch (Art. 21 DSGVO)</li>
            </ul>
            <p className="mt-2">
              Zudem haben Sie das Recht, sich bei einer Datenschutz-Aufsichtsbehoerde ueber die Verarbeitung Ihrer
              personenbezogenen Daten zu beschweren. Zustaendige Aufsichtsbehoerde: Der Landesbeauftragte fuer den
              Datenschutz und die Informationsfreiheit Baden-Wuerttemberg, Lautenschlagerstr. 20, 70173 Stuttgart.
            </p>
          </section>

          {/* 9. Aktualitaet */}
          <section>
            <h2 className="text-xl font-bold text-dark-100 mb-3">9. Aktualitaet und Aenderung dieser Datenschutzerklaerung</h2>
            <p>
              Diese Datenschutzerklaerung ist aktuell gueltig und hat den Stand Februar 2026. Durch die Weiterentwicklung
              unserer Website oder aufgrund geaenderter gesetzlicher Vorgaben kann es notwendig werden, diese
              Datenschutzerklaerung zu aendern.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
