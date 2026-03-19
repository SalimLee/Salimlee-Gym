'use client'

import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Exercise } from '@/types'
import MediaPicker from './MediaPicker'

const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Arms', 'Shoulders', 'Core', 'Full Body']
const EXERCISE_TYPES = ['strength', 'cardio', 'flexibility', 'core']
const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert']

const DIFF_LABELS: Record<string, string> = {
  beginner: 'Anfänger',
  intermediate: 'Fortgeschritten',
  advanced: 'Erfahren',
  expert: 'Experte',
}

const TYPE_COLORS: Record<string, { color: string; bg: string }> = {
  strength: { color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/30' },
  cardio: { color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/30' },
  flexibility: { color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/30' },
  core: { color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30' },
}

const DIFF_COLORS: Record<string, { color: string; bg: string }> = {
  beginner: { color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30' },
  intermediate: { color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30' },
  advanced: { color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/30' },
  expert: { color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/30' },
}

interface ExercisesViewProps {
  exercises: Exercise[]
  supabase: SupabaseClient
  onRefresh: () => void
  userId: string
}

const emptyForm = {
  name: '', description: '', target_muscle: '', exercise_type: 'strength',
  difficulty_level: 'beginner', default_sets: '', default_reps: '',
  default_duration_seconds: '', instructions: '', video_url: '', image_url: '',
}

export default function ExercisesView({ exercises, supabase, onRefresh, userId }: ExercisesViewProps) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [mediaPickerConfig, setMediaPickerConfig] = useState<{ isOpen: boolean; field: 'image_url' | 'video_url' } | null>(null)

  const filtered = exercises.filter(e => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.target_muscle?.toLowerCase().includes(search.toLowerCase()))
    const matchType = typeFilter === 'all' || e.exercise_type === typeFilter
    return matchSearch && matchType
  })

  const stats = {
    total: exercises.length,
    strength: exercises.filter(e => e.exercise_type === 'strength').length,
    cardio: exercises.filter(e => e.exercise_type === 'cardio').length,
    core: exercises.filter(e => e.exercise_type === 'core').length,
  }

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowAdvanced(false); setShowModal(true) }
  const openEdit = (ex: Exercise) => {
    setForm({
      name: ex.name, description: ex.description || '', target_muscle: ex.target_muscle || '',
      exercise_type: ex.exercise_type, difficulty_level: ex.difficulty_level,
      default_sets: ex.default_sets?.toString() ?? '', default_reps: ex.default_reps?.toString() ?? '',
      default_duration_seconds: ex.default_duration_seconds?.toString() ?? '',
      instructions: ex.instructions || '', video_url: ex.video_url || '', image_url: ex.image_url || '',
    })
    setEditingId(ex.id); setShowAdvanced(true); setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      target_muscle: form.target_muscle || null,
      exercise_type: form.exercise_type,
      difficulty_level: form.difficulty_level,
      default_sets: form.default_sets !== '' ? parseInt(form.default_sets) : null,
      default_reps: form.default_reps !== '' ? parseInt(form.default_reps) : null,
      default_duration_seconds: form.default_duration_seconds !== '' ? parseInt(form.default_duration_seconds) : null,
      instructions: form.instructions.trim() || null,
      video_url: form.video_url.trim() || null,
      image_url: form.image_url.trim() || null,
    }
    let error
    if (editingId) {
      const res = await supabase.from('exercises').update(payload).eq('id', editingId)
      error = res.error
    } else {
      const res = await supabase.from('exercises').insert({ ...payload, created_by: userId })
      error = res.error
    }
    if (error) {
      console.error('Exercise save error:', error)
      alert(`Fehler beim Speichern: ${error.message}`)
      setSaving(false)
      return
    }
    setSaving(false); setShowModal(false); onRefresh()
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await supabase.from('exercises').delete().eq('id', deleteId)
    setDeleteId(null); onRefresh()
  }

  const setField = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }))

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Gesamt', val: stats.total, filter: 'all', active: typeFilter === 'all', color: 'brand' },
          { label: 'Strength', val: stats.strength, filter: 'strength', active: typeFilter === 'strength', color: 'blue' },
          { label: 'Cardio', val: stats.cardio, filter: 'cardio', active: typeFilter === 'cardio', color: 'orange' },
          { label: 'Core', val: stats.core, filter: 'core', active: typeFilter === 'core', color: 'green' },
        ].map(s => (
          <button key={s.filter} onClick={() => setTypeFilter(s.filter)}
            className={`p-4 rounded-xl border transition-all text-left ${s.active ? `bg-${s.color}-500/10 border-${s.color}-500/50` : 'bg-dark-900/50 border-dark-800 hover:border-dark-700'}`}>
            <p className={`text-2xl font-black ${s.active ? `text-${s.color}-400` : 'text-dark-100'}`}>{s.val}</p>
            <p className="text-xs text-dark-400 mt-1">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Search + Create */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Übung suchen..."
            className="w-full pl-10 pr-4 py-3 bg-dark-900/50 border border-dark-800 rounded-xl text-dark-100 placeholder:text-dark-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm" />
        </div>
        <button onClick={openCreate} className="px-5 py-3 bg-brand-500 hover:bg-brand-400 text-white font-bold rounded-xl transition-all text-sm whitespace-nowrap flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Neue Übung
        </button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-dark-900/50 rounded-xl border border-dark-800 p-12 text-center">
          <p className="text-dark-500">Keine Übungen gefunden</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(ex => {
            const tc = TYPE_COLORS[ex.exercise_type] || TYPE_COLORS.strength
            const dc = DIFF_COLORS[ex.difficulty_level] || DIFF_COLORS.beginner
            return (
              <div key={ex.id} className="bg-dark-900/50 rounded-xl border border-dark-800 hover:border-dark-700 transition-all group">
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-dark-100 text-sm">{ex.name}</h3>
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(ex)} className="p-1.5 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-brand-500 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => setDeleteId(ex.id)} className="p-1.5 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-red-400 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${tc.bg} ${tc.color}`}>{ex.exercise_type}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${dc.bg} ${dc.color}`}>{DIFF_LABELS[ex.difficulty_level] || ex.difficulty_level}</span>
                    {ex.target_muscle && <span className="px-2 py-0.5 rounded-full text-xs border border-dark-700 text-dark-400">{ex.target_muscle}</span>}
                  </div>
                  {(ex.default_sets !== null || ex.default_reps !== null || ex.default_duration_seconds !== null) && (
                    <div className="flex flex-wrap gap-2 text-xs text-dark-400">
                      {(ex.default_sets !== null && ex.default_sets !== undefined) && <span>{ex.default_sets} Sets</span>}
                      {(ex.default_reps !== null && ex.default_reps !== undefined) && <span>{ex.default_reps} Reps</span>}
                      {(ex.default_duration_seconds !== null && ex.default_duration_seconds !== undefined) && <span>{ex.default_duration_seconds}s</span>}
                    </div>
                  )}
                  {ex.description && <p className="text-xs text-dark-500 line-clamp-2">{ex.description}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !saving && setShowModal(false)}>
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-dark-800 flex items-center justify-between">
              <h3 className="font-bold text-dark-100 text-lg">{editingId ? 'Übung bearbeiten' : 'Neue Übung'}</h3>
              <button onClick={() => setShowModal(false)} className="text-dark-500 hover:text-dark-300"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Name *</label>
                <input value={form.name} onChange={e => setField('name', e.target.value)} className="input-field text-sm" placeholder="z.B. Push-ups" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Beschreibung</label>
                <textarea value={form.description} onChange={e => setField('description', e.target.value)} rows={2} className="input-field text-sm resize-none" placeholder="Kurze Beschreibung..." />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Muskelgruppe</label>
                  <select value={form.target_muscle} onChange={e => setField('target_muscle', e.target.value)} className="input-field text-sm">
                    <option value="">—</option>
                    {MUSCLE_GROUPS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Typ *</label>
                  <select value={form.exercise_type} onChange={e => setField('exercise_type', e.target.value)} className="input-field text-sm">
                    {EXERCISE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Schwierigkeit</label>
                  <select value={form.difficulty_level} onChange={e => setField('difficulty_level', e.target.value)} className="input-field text-sm">
                    {DIFFICULTY_LEVELS.map(d => <option key={d} value={d}>{DIFF_LABELS[d]}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-sm font-medium text-dark-300 mb-1.5">Sets</label><input type="number" value={form.default_sets} onChange={e => setField('default_sets', e.target.value)} className="input-field text-sm" placeholder="3" /></div>
                <div><label className="block text-sm font-medium text-dark-300 mb-1.5">Reps</label><input type="number" value={form.default_reps} onChange={e => setField('default_reps', e.target.value)} className="input-field text-sm" placeholder="12" /></div>
                <div><label className="block text-sm font-medium text-dark-300 mb-1.5">Dauer (Sek)</label><input type="number" value={form.default_duration_seconds} onChange={e => setField('default_duration_seconds', e.target.value)} className="input-field text-sm" placeholder="60" /></div>
              </div>

              {/* Advanced Toggle */}
              <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full flex items-center justify-between py-2 text-sm text-dark-400 hover:text-dark-200 transition-colors">
                <span>Erweiterte Felder</span>
                <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {showAdvanced && (
                <div className="space-y-4 border-t border-dark-800 pt-4">
                  <div><label className="block text-sm font-medium text-dark-300 mb-1.5">Anleitung</label><textarea value={form.instructions} onChange={e => setField('instructions', e.target.value)} rows={3} className="input-field text-sm resize-none" placeholder="Schritt-für-Schritt..." /></div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Video URL</label>
                    <div className="flex gap-2">
                      <input value={form.video_url} onChange={e => setField('video_url', e.target.value)} className="input-field text-sm flex-1" placeholder="https://..." />
                      <button type="button" onClick={() => setMediaPickerConfig({ isOpen: true, field: 'video_url' })} className="px-3 py-2 bg-dark-800 hover:bg-dark-700 text-dark-300 text-sm font-bold rounded-xl transition-all border border-dark-700">Wählen</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Bild URL</label>
                    <div className="flex gap-2">
                      <input value={form.image_url} onChange={e => setField('image_url', e.target.value)} className="input-field text-sm flex-1" placeholder="https://..." />
                      <button type="button" onClick={() => setMediaPickerConfig({ isOpen: true, field: 'image_url' })} className="px-3 py-2 bg-dark-800 hover:bg-dark-700 text-dark-300 text-sm font-bold rounded-xl transition-all border border-dark-700">Wählen</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-dark-800 flex gap-3">
              <button onClick={() => setShowModal(false)} disabled={saving} className="flex-1 px-4 py-3 text-sm font-bold rounded-xl bg-dark-800 text-dark-300 border border-dark-700 hover:border-dark-600 transition-all">Abbrechen</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()} className="flex-1 px-4 py-3 text-sm font-bold rounded-xl bg-brand-500 text-white hover:bg-brand-400 transition-all disabled:opacity-50">
                {saving ? 'Speichert...' : editingId ? 'Aktualisieren' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Picker Modal */}
      {mediaPickerConfig?.isOpen && (
        <MediaPicker 
          supabase={supabase}
          defaultTab={mediaPickerConfig.field === 'image_url' ? 'image' : 'video'}
          onSelect={(url) => {
            setField(mediaPickerConfig.field, url)
            setMediaPickerConfig(null)
          }}
          onClose={() => setMediaPickerConfig(null)}
        />
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4"><svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></div>
            <h3 className="font-bold text-dark-100 mb-2">Übung löschen?</h3>
            <p className="text-sm text-dark-400 mb-6">Diese Aktion kann nicht rückgängig gemacht werden. Die Übung wird auch aus allen Workouts entfernt.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2.5 text-sm font-bold rounded-xl bg-dark-800 text-dark-300 border border-dark-700">Abbrechen</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2.5 text-sm font-bold rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30">Löschen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
