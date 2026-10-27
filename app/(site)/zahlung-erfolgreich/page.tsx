import Link from 'next/link'

export const metadata = {
  title: 'Zahlung erfolgreich – Salim Lee Boxing & Fitness Gym',
}

export default function ZahlungErfolgreichPage() {
  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-dark-900 rounded-2xl border border-dark-800 overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-green-500 p-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white">Zahlung erfolgreich!</h1>
        </div>
        <div className="p-8 text-center space-y-4">
          <p className="text-dark-300 leading-relaxed">
            Vielen Dank! Deine Zahlung war erfolgreich und deine Mitgliedschaft ist jetzt aktiv.
          </p>
          <p className="text-dark-400 text-sm">
            Du erhältst in Kürze eine Bestätigung per E-Mail.
          </p>
          <Link
            href="/"
            className="inline-block mt-4 px-6 py-3 bg-brand-500 text-white font-bold rounded-lg hover:bg-brand-400 transition-colors"
          >
            Zurück zur Website
          </Link>
        </div>
      </div>
    </div>
  )
}
