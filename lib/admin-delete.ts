import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Löscht eine Zeile aus einer Tabelle über die server-seitige API-Route.
 * Die Route verwendet den SUPABASE_SERVICE_ROLE_KEY und umgeht damit RLS,
 * sodass die Löschung garantiert in der Datenbank ausgeführt wird.
 */
export async function adminDelete(
  supabase: SupabaseClient,
  table: string,
  id: string,
  column: string = 'id'
): Promise<{ error: string | null }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const session = sessionData.session
    if (!session) {
      return { error: 'Keine aktive Session. Bitte neu anmelden.' }
    }

    const res = await fetch('/api/admin/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ table, id, column }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.error) {
      return { error: data.error || 'Löschen fehlgeschlagen' }
    }

    return { error: null }
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : 'Unbekannter Fehler beim Löschen',
    }
  }
}
