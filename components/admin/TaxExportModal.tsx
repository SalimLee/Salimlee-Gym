'use client'

import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

interface TaxExportModalProps {
  supabase: SupabaseClient
  onClose: () => void
}

type ExportMode = 'range' | 'quarter'

const QUARTERS = [
  { label: 'Q1 (Jan – Mär)', value: 1 },
  { label: 'Q2 (Apr – Jun)', value: 2 },
  { label: 'Q3 (Jul – Sep)', value: 3 },
  { label: 'Q4 (Okt – Dez)', value: 4 },
]

function quarterToRange(quarter: number, year: number): { from: string; to: string } {
  const startMonth = (quarter - 1) * 3
  const from = `${year}-${String(startMonth + 1).padStart(2, '0')}-01`
  const endMonth = startMonth + 3
  const lastDay = new Date(year, endMonth, 0).getDate()
  const to = `${year}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

export default function TaxExportModal({ supabase, onClose }: TaxExportModalProps) {
  const currentYear = new Date().getFullYear()
  const [mode, setMode] = useState<ExportMode>('quarter')
  const [quarter, setQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3))
  const [year, setYear] = useState(currentYear)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    setExporting(true)
    setError(null)

    const range = mode === 'quarter'
      ? quarterToRange(quarter, year)
      : { from: dateFrom, to: dateTo }

    if (!range.from || !range.to) {
      setError('Bitte Zeitraum auswählen')
      setExporting(false)
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/invoices/tax-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(range),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Export fehlgeschlagen')
        setExporting(false)
        return
      }

      // Download ZIP
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Steuer-Export_${range.from}_bis_${range.to}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      onClose()
    } catch {
      setError('Export fehlgeschlagen')
    }
    setExporting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !exporting && onClose()}>
      <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-dark-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-lg">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <div>
            <h3 className="font-bold text-dark-100 text-lg">Steuer-Export</h3>
            <p className="text-dark-500 text-sm">Alle Rechnungen als ZIP mit PDFs + CSV</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Mode Toggle */}
          <div className="flex rounded-xl overflow-hidden border border-dark-700">
            <button
              onClick={() => setMode('quarter')}
              className={`flex-1 px-4 py-2.5 text-sm font-bold transition-all ${mode === 'quarter' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-dark-800/50 text-dark-400 hover:text-dark-300'}`}
            >
              Quartal
            </button>
            <button
              onClick={() => setMode('range')}
              className={`flex-1 px-4 py-2.5 text-sm font-bold transition-all ${mode === 'range' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-dark-800/50 text-dark-400 hover:text-dark-300'}`}
            >
              Zeitraum
            </button>
          </div>

          {mode === 'quarter' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-dark-500 block mb-1">Quartal</label>
                <select
                  value={quarter}
                  onChange={e => setQuarter(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-dark-800/50 border border-dark-700 rounded-xl text-dark-100 focus:border-indigo-500 focus:outline-none text-sm"
                >
                  {QUARTERS.map(q => (
                    <option key={q.value} value={q.value}>{q.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-dark-500 block mb-1">Jahr</label>
                <select
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-dark-800/50 border border-dark-700 rounded-xl text-dark-100 focus:border-indigo-500 focus:outline-none text-sm"
                >
                  {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-dark-500 block mb-1">Von</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-800/50 border border-dark-700 rounded-xl text-dark-100 focus:border-indigo-500 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-dark-500 block mb-1">Bis</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-800/50 border border-dark-700 rounded-xl text-dark-100 focus:border-indigo-500 focus:outline-none text-sm"
                />
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="p-3 bg-dark-800/50 rounded-lg">
            <p className="text-xs text-dark-400">
              Der Export enthält alle Stripe- und manuellen Rechnungen im gewählten Zeitraum als einzelne PDFs plus eine Zusammenfassung als CSV-Datei.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-dark-800 flex gap-3">
          <button
            onClick={onClose}
            disabled={exporting}
            className="flex-1 px-4 py-3 text-sm font-bold rounded-xl bg-dark-800 text-dark-300 border border-dark-700 hover:border-dark-600 transition-all disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || (mode === 'range' && (!dateFrom || !dateTo))}
            className="flex-1 px-4 py-3 text-sm font-bold rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30 transition-all disabled:opacity-50"
          >
            {exporting ? 'Exportiert...' : 'Export starten'}
          </button>
        </div>
      </div>
    </div>
  )
}
