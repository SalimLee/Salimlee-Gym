'use client'

import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Exercise, WorkoutWithExercises } from '@/types'

const MUSCLE_GROUPS = ['Full Body', 'Upper Body', 'Lower Body', 'Core', 'Chest', 'Back', 'Legs', 'Arms', 'Shoulders']
const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert']

const DIFF_LABELS: Record<string, string> = {
  beginner: 'Anfänger',
  intermediate: 'Fortgeschritten',
  advanced: 'Erfahren',
  expert: 'Experte',
}

const DIFF_COLORS: Record<string, { color: string; bg: string }> = {
  beginner: { color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30' },
  intermediate: { color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30' },
  advanced: { color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/30' },
  expert: { color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/30' },
}

interface SelectedExercise {
  exercise_id: string
  exercise_order: number
  sets: string
  reps: string
  duration_seconds: string
  rest_seconds: string
  notes: string
  exercise?: Exercise
}

interface WorkoutsViewProps {
  workouts: WorkoutWithExercises[]
  exercises: Exercise[]
  supabase: SupabaseClient
  onRefresh: () => void
  userId: string
}

const emptyForm = {
  name: '', description: '', target_muscle_group: '', difficulty_level: 'beginner',
  estimated_duration_minutes: '', estimated_calories: '', is_published: false, image_url: '', tags: '',
}

export default function WorkoutsView({ workouts, exercises, supabase, onRefresh, userId }: WorkoutsViewProps) {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([])
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [detailWorkout, setDetailWorkout] = useState<WorkoutWithExercises | null>(null)

  const filtered = workouts.filter(w =>
    !search || w.name.toLowerCase().includes(search.toLowerCase()) ||
    (w.target_muscle_group?.toLowerCase().includes(search.toLowerCase()))
  )

  const stats = {
    total: workouts.length,
    published: workouts.filter(w => w.is_published).length,
    draft: workouts.filter(w => !w.is_published).length,
  }

  const openCreate = () => {
    setForm(emptyForm); setEditingId(null); setSelectedExercises([]); setExerciseSearch(''); setShowModal(true)
  }

  const openEdit = (w: WorkoutWithExercises) => {
    setForm({
      name: w.name, description: w.description || '', target_muscle_group: w.target_muscle_group || '',
      difficulty_level: w.difficulty_level, estimated_duration_minutes: w.estimated_duration_minutes?.toString() || '',
      estimated_calories: w.estimated_calories?.toString() || '',
      is_published: w.is_published, image_url: w.image_url || '', tags: w.tags?.join(', ') || '',
    })
    setSelectedExercises(
      (w.workout_exercises || [])
        .sort((a, b) => a.exercise_order - b.exercise_order)
        .map(we => ({
          exercise_id: we.exercise_id, exercise_order: we.exercise_order,
          sets: we.sets?.toString() ?? '', reps: we.reps?.toString() ?? '',
          duration_seconds: we.duration_seconds?.toString() ?? '', rest_seconds: we.rest_seconds?.toString() ?? '60',
          notes: we.notes || '', exercise: we.exercise,
        }))
    )
    setEditingId(w.id); setExerciseSearch(''); setShowModal(true)
  }

  const addExercise = (ex: Exercise) => {
    if (selectedExercises.some(s => s.exercise_id === ex.id)) return
    setSelectedExercises(prev => [...prev, {
      exercise_id: ex.id, exercise_order: prev.length + 1,
      sets: ex.default_sets?.toString() ?? '3', reps: ex.default_reps?.toString() ?? '12',
      duration_seconds: ex.default_duration_seconds?.toString() ?? '', rest_seconds: '60',
      notes: '', exercise: ex,
    }])
  }

  const removeExercise = (exerciseId: string) => {
    setSelectedExercises(prev =>
      prev.filter(s => s.exercise_id !== exerciseId).map((s, i) => ({ ...s, exercise_order: i + 1 }))
    )
  }

  const updateExField = (exerciseId: string, key: string, val: string) => {
    setSelectedExercises(prev => prev.map(s => s.exercise_id === exerciseId ? { ...s, [key]: val } : s))
  }

  const moveExercise = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= selectedExercises.length) return
    const arr = [...selectedExercises]
    ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
    setSelectedExercises(arr.map((s, i) => ({ ...s, exercise_order: i + 1 })))
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      name: form.name.trim(), description: form.description.trim() || null,
      target_muscle_group: form.target_muscle_group || null, difficulty_level: form.difficulty_level,
      estimated_duration_minutes: form.estimated_duration_minutes ? parseInt(form.estimated_duration_minutes) : null,
      estimated_calories: form.estimated_calories ? parseInt(form.estimated_calories) : null,
      is_published: form.is_published, image_url: form.image_url.trim() || null,
      tags: form.tags.trim() ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
    }

    let workoutId = editingId
    if (editingId) {
      const { error } = await supabase.from('workouts').update(payload).eq('id', editingId)
      if (error) { console.error('Workout update error:', error); alert(`Fehler: ${error.message}`); setSaving(false); return }
      await supabase.from('workout_exercises').delete().eq('workout_id', editingId)
    } else {
      const { data, error } = await supabase.from('workouts').insert({ ...payload, created_by: userId }).select('id').single()
      if (error) { console.error('Workout insert error:', error); alert(`Fehler: ${error.message}`); setSaving(false); return }
      workoutId = data?.id
    }

    if (workoutId && selectedExercises.length > 0) {
      const items = selectedExercises.map(s => ({
        workout_id: workoutId!, exercise_id: s.exercise_id, exercise_order: s.exercise_order,
        sets: s.sets !== '' ? parseInt(s.sets) : null, reps: s.reps !== '' ? parseInt(s.reps) : null,
        duration_seconds: s.duration_seconds !== '' ? parseInt(s.duration_seconds) : null,
        rest_seconds: s.rest_seconds !== '' ? parseInt(s.rest_seconds) : 60, notes: s.notes.trim() || null,
      }))
      const { error } = await supabase.from('workout_exercises').insert(items)
      if (error) { console.error('Workout exercises insert error:', error); alert(`Übungen zuweisen fehlgeschlagen: ${error.message}`) }
    }
    setSaving(false); setShowModal(false); onRefresh()
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await supabase.from('workouts').delete().eq('id', deleteId)
    setDeleteId(null); onRefresh()
  }

  const setField = (key: string, val: string | boolean) => setForm(p => ({ ...p, [key]: val }))

  const availableExercises = exercises.filter(ex =>
    !selectedExercises.some(s => s.exercise_id === ex.id) &&
    (!exerciseSearch || ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()))
  )

  // Detail View
  if (detailWorkout) {
    const dc = DIFF_COLORS[detailWorkout.difficulty_level] || DIFF_COLORS.beginner
    const sortedExercises = [...(detailWorkout.workout_exercises || [])].sort((a, b) => a.exercise_order - b.exercise_order)
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setDetailWorkout(null)} className="p-2 rounded-lg bg-dark-800 text-dark-400 hover:text-dark-200 border border-dark-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-black text-dark-100">{detailWorkout.name}</h2>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-xs border ${dc.bg} ${dc.color}`}>{DIFF_LABELS[detailWorkout.difficulty_level] || detailWorkout.difficulty_level}</span>
              {detailWorkout.target_muscle_group && <span className="px-2 py-0.5 rounded-full text-xs border border-dark-700 text-dark-400">{detailWorkout.target_muscle_group}</span>}
              {detailWorkout.estimated_duration_minutes && <span className="px-2 py-0.5 rounded-full text-xs border border-dark-700 text-dark-400">{detailWorkout.estimated_duration_minutes} min</span>}
              {detailWorkout.estimated_calories && <span className="px-2 py-0.5 rounded-full text-xs border border-orange-400/30 text-orange-400">{detailWorkout.estimated_calories} kcal</span>}
              <span className={`px-2 py-0.5 rounded-full text-xs border ${detailWorkout.is_published ? 'bg-green-400/10 border-green-400/30 text-green-400' : 'bg-dark-700/50 border-dark-600 text-dark-400'}`}>{detailWorkout.is_published ? 'Published' : 'Draft'}</span>
            </div>
          </div>
          <button onClick={() => { setDetailWorkout(null); openEdit(detailWorkout) }} className="px-4 py-2 text-sm font-bold rounded-lg bg-brand-500/10 text-brand-500 border border-brand-500/30 hover:bg-brand-500/20 transition-all">Bearbeiten</button>
        </div>
        {detailWorkout.description && <p className="text-sm text-dark-400 bg-dark-900/50 rounded-xl border border-dark-800 p-4">{detailWorkout.description}</p>}
        {detailWorkout.tags && detailWorkout.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">{detailWorkout.tags.map(t => <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-brand-500/10 text-brand-400 border border-brand-500/20">{t}</span>)}</div>
        )}
        <div className="bg-dark-900/50 rounded-xl border border-dark-800">
          <div className="p-4 border-b border-dark-800"><h3 className="font-bold text-dark-100">Übungen ({sortedExercises.length})</h3></div>
          {sortedExercises.length === 0 ? (
            <p className="p-8 text-center text-dark-500 text-sm">Keine Übungen zugewiesen</p>
          ) : (
            <div className="divide-y divide-dark-800">
              {sortedExercises.map(we => (
                <div key={we.id} className="p-4 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-sm font-black text-brand-500 shrink-0">{we.exercise_order}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-dark-100 text-sm">{we.exercise?.name || 'Unbekannt'}</p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-dark-400">
                      {we.sets !== null && <span>{we.sets} Sets</span>}
                      {we.reps !== null && <span>{we.reps} Reps</span>}
                      {we.duration_seconds !== null && <span>{we.duration_seconds}s</span>}
                      {we.rest_seconds !== null && <span>Pause: {we.rest_seconds}s</span>}
                    </div>
                    {we.notes && <p className="text-xs text-dark-500 mt-1">{we.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Gesamt', val: stats.total, color: 'brand' },
          { label: 'Published', val: stats.published, color: 'green' },
          { label: 'Entwurf', val: stats.draft, color: 'yellow' },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl border bg-dark-900/50 border-dark-800 text-left">
            <p className="text-2xl font-black text-dark-100">{s.val}</p>
            <p className="text-xs text-dark-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Create */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Workout suchen..."
            className="w-full pl-10 pr-4 py-3 bg-dark-900/50 border border-dark-800 rounded-xl text-dark-100 placeholder:text-dark-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm" />
        </div>
        <button onClick={openCreate} className="px-5 py-3 bg-brand-500 hover:bg-brand-400 text-white font-bold rounded-xl transition-all text-sm whitespace-nowrap flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Neues Workout
        </button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-dark-900/50 rounded-xl border border-dark-800 p-12 text-center"><p className="text-dark-500">Keine Workouts gefunden</p></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(w => {
            const dc = DIFF_COLORS[w.difficulty_level] || DIFF_COLORS.beginner
            const exCount = w.workout_exercises?.length || 0
            return (
              <div key={w.id} className="bg-dark-900/50 rounded-xl border border-dark-800 hover:border-dark-700 transition-all group cursor-pointer" onClick={() => setDetailWorkout(w)}>
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-dark-100 text-sm">{w.name}</h3>
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={e => { e.stopPropagation(); openEdit(w) }} className="p-1.5 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-brand-500 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={e => { e.stopPropagation(); setDeleteId(w.id) }} className="p-1.5 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-red-400 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${dc.bg} ${dc.color}`}>{DIFF_LABELS[w.difficulty_level] || w.difficulty_level}</span>
                    {w.target_muscle_group && <span className="px-2 py-0.5 rounded-full text-xs border border-dark-700 text-dark-400">{w.target_muscle_group}</span>}
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${w.is_published ? 'bg-green-400/10 border-green-400/30 text-green-400' : 'bg-dark-700/50 border-dark-600 text-dark-400'}`}>{w.is_published ? 'Live' : 'Draft'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-dark-400">
                    {w.estimated_duration_minutes && <span className="flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{w.estimated_duration_minutes} min</span>}
                    <span>{exCount} Übung{exCount !== 1 ? 'en' : ''}</span>
                  </div>
                  {w.description && <p className="text-xs text-dark-500 line-clamp-2">{w.description}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !saving && setShowModal(false)}>
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-dark-800 flex items-center justify-between">
              <h3 className="font-bold text-dark-100 text-lg">{editingId ? 'Workout bearbeiten' : 'Neues Workout'}</h3>
              <button onClick={() => setShowModal(false)} className="text-dark-500 hover:text-dark-300"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-5 space-y-5">
              {/* Workout Details */}
              <div className="space-y-4">
                <p className="text-xs text-dark-500 uppercase tracking-wider font-bold">Workout Details</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-dark-300 mb-1.5">Name *</label><input value={form.name} onChange={e => setField('name', e.target.value)} className="input-field text-sm" placeholder="z.B. Full Body Beginner" /></div>
                  <div><label className="block text-sm font-medium text-dark-300 mb-1.5">Muskelgruppe</label>
                    <select value={form.target_muscle_group} onChange={e => setField('target_muscle_group', e.target.value)} className="input-field text-sm"><option value="">—</option>{MUSCLE_GROUPS.map(m => <option key={m} value={m}>{m}</option>)}</select>
                  </div>
                </div>
                <div><label className="block text-sm font-medium text-dark-300 mb-1.5">Beschreibung</label><textarea value={form.description} onChange={e => setField('description', e.target.value)} rows={2} className="input-field text-sm resize-none" placeholder="Workout Beschreibung..." /></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><label className="block text-sm font-medium text-dark-300 mb-1.5">Schwierigkeit</label><select value={form.difficulty_level} onChange={e => setField('difficulty_level', e.target.value)} className="input-field text-sm">{DIFFICULTY_LEVELS.map(d => <option key={d} value={d}>{DIFF_LABELS[d]}</option>)}</select></div>
                  <div><label className="block text-sm font-medium text-dark-300 mb-1.5">Dauer (min)</label><input type="number" value={form.estimated_duration_minutes} onChange={e => setField('estimated_duration_minutes', e.target.value)} className="input-field text-sm" placeholder="30" /></div>
                  <div><label className="block text-sm font-medium text-dark-300 mb-1.5">Kalorien (kcal)</label><input type="number" value={form.estimated_calories} onChange={e => setField('estimated_calories', e.target.value)} className="input-field text-sm" placeholder="250" /></div>
                  <div><label className="block text-sm font-medium text-dark-300 mb-1.5">Tags</label><input value={form.tags} onChange={e => setField('tags', e.target.value)} className="input-field text-sm" placeholder="strength, home" /></div>
                  <div><label className="block text-sm font-medium text-dark-300 mb-1.5">Bild URL</label><input value={form.image_url} onChange={e => setField('image_url', e.target.value)} className="input-field text-sm" placeholder="https://..." /></div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className={`w-10 h-6 rounded-full transition-colors relative ${form.is_published ? 'bg-green-500' : 'bg-dark-700'}`} onClick={() => setField('is_published', !form.is_published)}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.is_published ? 'left-5' : 'left-1'}`} />
                  </div>
                  <span className="text-sm text-dark-300">{form.is_published ? 'Veröffentlicht' : 'Entwurf'}</span>
                </label>
              </div>

              {/* Exercise Picker */}
              <div className="space-y-4 border-t border-dark-800 pt-5">
                <p className="text-xs text-dark-500 uppercase tracking-wider font-bold">Übungen zuweisen</p>
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Available */}
                  <div className="bg-dark-800/30 rounded-xl border border-dark-800 overflow-hidden">
                    <div className="p-3 border-b border-dark-700">
                      <p className="text-xs font-bold text-dark-400 mb-2">Verfügbar ({availableExercises.length})</p>
                      <input value={exerciseSearch} onChange={e => setExerciseSearch(e.target.value)} className="w-full px-3 py-2 bg-dark-800/50 border border-dark-700 rounded-lg text-dark-100 placeholder:text-dark-500 text-xs focus:border-brand-500 focus:outline-none" placeholder="Suchen..." />
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-dark-800">
                      {availableExercises.length === 0 ? (
                        <p className="p-4 text-center text-dark-500 text-xs">Keine verfügbar</p>
                      ) : availableExercises.map(ex => (
                        <button key={ex.id} onClick={() => addExercise(ex)} className="w-full p-3 text-left hover:bg-dark-700/50 transition-colors flex items-center justify-between">
                          <div><p className="text-xs font-bold text-dark-200">{ex.name}</p><p className="text-xs text-dark-500">{ex.exercise_type}{ex.target_muscle ? ` · ${ex.target_muscle}` : ''}</p></div>
                          <svg className="w-4 h-4 text-dark-500 hover:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected */}
                  <div className="bg-dark-800/30 rounded-xl border border-dark-800 overflow-hidden">
                    <div className="p-3 border-b border-dark-700"><p className="text-xs font-bold text-dark-400">Zugewiesen ({selectedExercises.length})</p></div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-dark-800">
                      {selectedExercises.length === 0 ? (
                        <p className="p-4 text-center text-dark-500 text-xs">Übungen links auswählen</p>
                      ) : selectedExercises.map((se, idx) => (
                        <div key={se.exercise_id} className="p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded bg-brand-500/20 flex items-center justify-center text-xs font-bold text-brand-400">{se.exercise_order}</span>
                              <p className="text-xs font-bold text-dark-200">{se.exercise?.name || 'Übung'}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => moveExercise(idx, -1)} disabled={idx === 0} className="p-1 text-dark-500 hover:text-dark-300 disabled:opacity-30"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg></button>
                              <button onClick={() => moveExercise(idx, 1)} disabled={idx === selectedExercises.length - 1} className="p-1 text-dark-500 hover:text-dark-300 disabled:opacity-30"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>
                              <button onClick={() => removeExercise(se.exercise_id)} className="p-1 text-dark-500 hover:text-red-400"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-1.5">
                            <input type="number" value={se.sets} onChange={e => updateExField(se.exercise_id, 'sets', e.target.value)} placeholder="Sets" className="px-2 py-1 bg-dark-800/50 border border-dark-700 rounded text-xs text-dark-200 focus:border-brand-500 focus:outline-none" />
                            <input type="number" value={se.reps} onChange={e => updateExField(se.exercise_id, 'reps', e.target.value)} placeholder="Reps" className="px-2 py-1 bg-dark-800/50 border border-dark-700 rounded text-xs text-dark-200 focus:border-brand-500 focus:outline-none" />
                            <input type="number" value={se.duration_seconds} onChange={e => updateExField(se.exercise_id, 'duration_seconds', e.target.value)} placeholder="Sek" className="px-2 py-1 bg-dark-800/50 border border-dark-700 rounded text-xs text-dark-200 focus:border-brand-500 focus:outline-none" />
                            <input type="number" value={se.rest_seconds} onChange={e => updateExField(se.exercise_id, 'rest_seconds', e.target.value)} placeholder="Pause" className="px-2 py-1 bg-dark-800/50 border border-dark-700 rounded text-xs text-dark-200 focus:border-brand-500 focus:outline-none" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
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

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4"><svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></div>
            <h3 className="font-bold text-dark-100 mb-2">Workout löschen?</h3>
            <p className="text-sm text-dark-400 mb-6">Alle zugewiesenen Übungen werden ebenfalls entfernt (CASCADE).</p>
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
