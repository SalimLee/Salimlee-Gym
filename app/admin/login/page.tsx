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
    <div className="admin-shell min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display font-black tracking-tight text-[32px] text-brand-500 leading-none">SALIM LEE</h1>
          <p className="admin-eyebrow mt-2">Admin Console</p>
        </div>

        <div className="admin-card p-7">
          <h2 className="admin-h2 mb-1">Anmelden</h2>
          <p className="admin-body mb-5">Bitte E-Mail und Passwort eingeben.</p>

          {error && (
            <div className="mb-4 p-3 bg-status-danger-soft border border-status-danger-border rounded-btn text-[12px] text-status-danger font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3">
            <label className="block">
              <span className="admin-caption block mb-1">E-Mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="admin-input"
                placeholder="info@salimlee-gym.de"
                required
                autoFocus
              />
            </label>

            <label className="block">
              <span className="admin-caption block mb-1">Passwort</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="admin-input"
                placeholder="••••••••"
                required
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="admin-btn-primary admin-btn w-full justify-center py-2.5 mt-2"
            >
              {loading ? 'Wird angemeldet…' : 'Anmelden'}
            </button>
          </form>
        </div>

        <div className="text-center mt-5">
          <a href="/" className="text-[13px] text-admin-mute hover:text-brand-500 transition-colors">
            ← Zurück zur Webseite
          </a>
        </div>
      </div>
    </div>
  )
}
