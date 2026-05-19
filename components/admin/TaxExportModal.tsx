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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in-fast" onClick={() => !exporting && onClose()}>
      <div className="admin-card bg-admin-surface w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-admin-hairline flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-admin-surface-soft text-brand-500 border border-brand-500/30 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <div>
            <h3 className="admin-h2">Steuer-Export</h3>
            <p className="admin-caption">ZIP mit PDFs + CSV-Übersicht</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex rounded-btn overflow-hidden border border-admin-hairline p-0.5 bg-admin-surface-soft">
            <button
              onClick={() => setMode('quarter')}
              className={`flex-1 px-3 py-1.5 text-[13px] font-semibold rounded-[5px] transition-all ${mode === 'quarter' ? 'bg-admin-surface text-admin-ink-strong border border-admin-hairline' : 'text-admin-body hover:text-admin-ink'}`}
            >
              Quartal
            </button>
            <button
              onClick={() => setMode('range')}
              className={`flex-1 px-3 py-1.5 text-[13px] font-semibold rounded-[5px] transition-all ${mode === 'range' ? 'bg-admin-surface text-admin-ink-strong border border-admin-hairline' : 'text-admin-body hover:text-admin-ink'}`}
            >
              Zeitraum
            </button>
          </div>

          {mode === 'quarter' ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="admin-caption block mb-1">Quartal</span>
                <select value={quarter} onChange={e => setQuarter(Number(e.target.value))} className="admin-select">
                  {QUARTERS.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="admin-caption block mb-1">Jahr</span>
                <select value={year} onChange={e => setYear(Number(e.target.value))} className="admin-select">
                  {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="admin-caption block mb-1">Von</span>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="admin-input" />
              </label>
              <label className="block">
                <span className="admin-caption block mb-1">Bis</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="admin-input" />
              </label>
            </div>
          )}

          <div className="p-3 bg-admin-surface-soft rounded-btn border border-admin-hairline-soft">
            <p className="admin-caption">
              Der Export enthält alle Stripe- und manuellen Rechnungen im gewählten Zeitraum als einzelne PDFs plus eine CSV-Zusammenfassung — direkt an den Steuerberater weitergebbar.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-status-danger-soft border border-status-danger-border rounded-btn">
              <p className="text-[12px] text-status-danger font-medium">{error}</p>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-admin-hairline flex gap-2 justify-end">
          <button onClick={onClose} disabled={exporting} className="admin-btn-ghost admin-btn">Abbrechen</button>
          <button onClick={handleExport} disabled={exporting || (mode === 'range' && (!dateFrom || !dateTo))} className="admin-btn-primary admin-btn">
            {exporting ? 'Exportiert…' : 'Export starten'}
          </button>
        </div>
      </div>
    </div>
  )
}
