import { NextRequest, NextResponse } from 'next/server'
import { requireAdminClient } from '@/lib/admin-auth'

const BUCKET = 'contracts'
const SIGNED_URL_TTL = 60 * 60 // 1 Stunde

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminClient(request)
    if (!auth.ok) return auth.response
    const { admin } = auth

    const { data: rows, error } = await admin
      .from('contract_archive')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('contract_archive Abruf fehlgeschlagen:', error)
      return NextResponse.json(
        { error: `Laden fehlgeschlagen: ${error.message}` },
        { status: 500 }
      )
    }

    // Signed URLs für jede Datei erzeugen, damit das Frontend sie direkt laden kann
    const contracts = await Promise.all(
      (rows || []).map(async (row) => {
        const { data: signed } = await admin.storage
          .from(BUCKET)
          .createSignedUrl(row.file_path, SIGNED_URL_TTL)

        return {
          ...row,
          signed_url: signed?.signedUrl || null,
        }
      })
    )

    return NextResponse.json({ contracts })
  } catch (error) {
    console.error('Contract-List Fehler:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unbekannter Fehler beim Laden',
      },
      { status: 500 }
    )
  }
}
