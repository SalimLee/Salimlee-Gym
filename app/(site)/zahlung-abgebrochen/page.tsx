import Link from 'next/link'

export const metadata = {
  title: 'Zahlung abgebrochen – Salim Lee Boxing & Fitness Gym',
}

export default function ZahlungAbgebrochenPage() {
  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-dark-900 rounded-2xl border border-dark-800 overflow-hidden">
        <div className="bg-gradient-to-r from-dark-700 to-dark-600 p-8 text-center">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white">Zahlung abgebrochen</h1>
        </div>
        <div className="p-8 text-center space-y-4">
          <p className="text-dark-300 leading-relaxed">
            Die Zahlung wurde abgebrochen. Keine Sorge – du kannst den Zahlungslink in deiner E-Mail jederzeit erneut verwenden.
          </p>
          <p className="text-dark-400 text-sm">
            Bei Fragen erreichst du uns unter{' '}
            <a href="mailto:info@salimlee-gym.de" className="text-brand-400 hover:text-brand-300">
              info@salimlee-gym.de
            </a>{' '}
            oder telefonisch unter <strong className="text-dark-200">+49 151 68457943</strong>.
          </p>
          <Link
            href="/"
            className="inline-block mt-4 px-6 py-3 bg-dark-800 text-white font-bold rounded-lg hover:bg-dark-700 transition-colors border border-dark-700"
          >
            Zurück zur Website
          </Link>
        </div>
      </div>
    </div>
  )
}
