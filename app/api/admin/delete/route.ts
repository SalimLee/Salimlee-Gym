import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ALLOWED_TABLES = [
  'bookings',
  'members',
  'subscriptions',
  'invoices',
  'exercises',
  'workouts',
  'workout_exercises',
] as const

type AllowedTable = typeof ALLOWED_TABLES[number]

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { error: 'Supabase ist nicht konfiguriert.' },
        { status: 500 }
      )
    }

    if (!serviceKey) {
      return NextResponse.json(
        {
          error:
            'SUPABASE_SERVICE_ROLE_KEY fehlt in den Umgebungsvariablen. Bitte in den Vercel Environment Variables hinzufügen.',
        },
        { status: 500 }
      )
    }

    // User authentifizieren über den übergebenen Access Token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }
    const token = authHeader.slice(7)

    const authClient = createClient(supabaseUrl, anonKey)
    const { data: userData, error: authError } = await authClient.auth.getUser(token)
    if (authError || !userData.user) {
      return NextResponse.json({ error: 'Ungültige Session' }, { status: 401 })
    }

    const body = await request.json()
    const { table, id, column = 'id' } = body as {
      table?: string
      id?: string
      column?: string
    }

    if (!table || !id) {
      return NextResponse.json(
        { error: 'table und id sind erforderlich' },
        { status: 400 }
      )
    }

    if (!ALLOWED_TABLES.includes(table as AllowedTable)) {
      return NextResponse.json(
        { error: `Tabelle "${table}" ist nicht erlaubt` },
        { status: 400 }
      )
    }

    if (column !== 'id' && column !== 'member_id' && column !== 'workout_id') {
      return NextResponse.json(
        { error: `Spalte "${column}" ist nicht erlaubt` },
        { status: 400 }
      )
    }

    // Service-Role-Client umgeht RLS und garantiert das Löschen
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { error } = await adminClient.from(table).delete().eq(column, id)

    if (error) {
      console.error(`Löschen fehlgeschlagen (${table}):`, error)
      return NextResponse.json(
        { error: `Löschen fehlgeschlagen: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete API Fehler:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Unbekannter Fehler beim Löschen',
      },
      { status: 500 }
    )
  }
}
