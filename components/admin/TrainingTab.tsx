'use client'

import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Exercise, WorkoutWithExercises } from '@/types'
import ExercisesView from './ExercisesView'
import WorkoutsView from './WorkoutsView'

type SubTab = 'exercises' | 'workouts'

interface TrainingTabProps {
  exercises: Exercise[]
  workouts: WorkoutWithExercises[]
  supabase: SupabaseClient
  onRefresh: () => void
  userId: string
}

const SUB_TABS: { id: SubTab; label: string; icon: JSX.Element }[] = [
  {
    id: 'exercises', label: 'Übungen',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>,
  },
  {
    id: 'workouts', label: 'Workouts',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
  },
]

export default function TrainingTab({ exercises, workouts, supabase, onRefresh, userId }: TrainingTabProps) {
  const [subTab, setSubTab] = useState<SubTab>('exercises')

  return (
    <div className="space-y-6">
      {/* Sub-Tab Navigation */}
      <div className="flex gap-2">
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl border transition-all ${
              subTab === tab.id
                ? 'bg-brand-500/10 border-brand-500/50 text-brand-500'
                : 'bg-dark-900/50 border-dark-800 text-dark-400 hover:text-dark-200 hover:border-dark-700'
            }`}
          >
            {tab.icon}
            {tab.label}
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
              subTab === tab.id ? 'bg-brand-500/20 text-brand-400' : 'bg-dark-800 text-dark-500'
            }`}>
              {tab.id === 'exercises' ? exercises.length : workouts.length}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {subTab === 'exercises' && (
        <ExercisesView exercises={exercises} supabase={supabase} onRefresh={onRefresh} userId={userId} />
      )}
      {subTab === 'workouts' && (
        <WorkoutsView workouts={workouts} exercises={exercises} supabase={supabase} onRefresh={onRefresh} userId={userId} />
      )}
    </div>
  )
}
