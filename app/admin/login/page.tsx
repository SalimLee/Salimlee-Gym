'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError('E-Mail oder Passwort ist falsch. (' + error.message + ')')
        setLoading(false)
        return
      }

      if (!data.session) {
        setError('Login erfolgreich aber keine Session erhalten.')
        setLoading(false)
        return
      }

      // Erfolgreich - voller Seitenneulad zum Dashboard
      window.location.href = '/admin'
    } catch (err) {
      setError('Verbindungsfehler: ' + String(err))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black">
            <span className="gradient-text">SALIM LEE</span>
          </h1>
          <p className="text-dark-400 text-sm tracking-widest mt-1">ADMIN BEREICH</p>
        </div>

        {/* Login Card */}
        <div className="bg-dark-900/50 rounded-xl border border-brand-600/20 p-8">
          <h2 className="text-xl font-bold text-dark-100 mb-6">Anmelden</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2 text-dark-300">
                E-Mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="admin@salim-lee-gym.de"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-dark-300">
                Passwort
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Passwort eingeben"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-8 py-4 bg-gradient-to-r from-brand-500 to-brand-600 text-dark-950 font-black rounded-lg hover:shadow-lg hover:shadow-brand-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'WIRD ANGEMELDET...' : 'ANMELDEN'}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <a href="/" className="text-dark-500 hover:text-brand-500 text-sm transition-colors">
            Zurück zur Webseite
          </a>
        </div>
      </div>
    </div>
  )
}
