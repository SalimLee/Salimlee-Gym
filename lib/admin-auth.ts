import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Prüft die Admin-Authentifizierung für eine API-Route und liefert einen
 * Service-Role-Client zurück. RLS wird damit umgangen, deshalb MUSS der
 * aufrufende Request immer erst den Bearer-Token validieren.
 */
export async function requireAdminClient(
  request: NextRequest
): Promise<
  | { ok: true; admin: SupabaseClient; userId: string }
  | { ok: false; response: NextResponse }
> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !anonKey) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Supabase ist nicht konfiguriert.' },
        { status: 500 }
      ),
    }
  }

  if (!serviceKey) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            'SUPABASE_SERVICE_ROLE_KEY fehlt in den Umgebungsvariablen. Bitte in den Vercel Environment Variables hinzufügen.',
        },
        { status: 500 }
      ),
    }
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 }),
    }
  }
  const token = authHeader.slice(7)

  const authClient = createClient(supabaseUrl, anonKey)
  const { data: userData, error: authError } = await authClient.auth.getUser(token)
  if (authError || !userData.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Ungültige Session' }, { status: 401 }),
    }
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  return { ok: true, admin, userId: userData.user.id }
}
