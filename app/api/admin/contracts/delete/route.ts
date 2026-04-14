import { NextRequest, NextResponse } from 'next/server'
import { requireAdminClient } from '@/lib/admin-auth'

const BUCKET = 'contracts'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminClient(request)
    if (!auth.ok) return auth.response
    const { admin } = auth

    const body = await request.json().catch(() => ({}))
    const { id } = body as { id?: string }

    if (!id) {
      return NextResponse.json(
        { error: 'id ist erforderlich' },
        { status: 400 }
      )
    }

    // Zuerst die Zeile laden, um den Storage-Pfad zu bekommen
    const { data: row, error: fetchError } = await admin
      .from('contract_archive')
      .select('id, file_path')
      .eq('id', id)
      .single()

    if (fetchError || !row) {
      return NextResponse.json(
        { error: 'Vertrag nicht gefunden' },
        { status: 404 }
      )
    }

    // Datei im Storage löschen (Fehler hier ignorieren wir bewusst nicht,
    // aber blockieren das DB-Löschen nicht, falls die Datei bereits fehlt)
    const { error: storageError } = await admin.storage
      .from(BUCKET)
      .remove([row.file_path])

    if (storageError) {
      console.warn(
        `Storage-Datei konnte nicht gelöscht werden (${row.file_path}):`,
        storageError.message
      )
    }

    const { error: deleteError } = await admin
      .from('contract_archive')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('contract_archive Löschen fehlgeschlagen:', deleteError)
      return NextResponse.json(
        { error: `Löschen fehlgeschlagen: ${deleteError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contract-Delete Fehler:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unbekannter Fehler beim Löschen',
      },
      { status: 500 }
    )
  }
}
