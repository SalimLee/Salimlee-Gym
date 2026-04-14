import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { requireAdminClient } from '@/lib/admin-auth'

const BUCKET = 'contracts'
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminClient(request)
    if (!auth.ok) return auth.response
    const { admin } = auth

    const formData = await request.formData()

    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Keine PDF-Datei übermittelt.' },
        { status: 400 }
      )
    }

    if (file.type && file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Nur PDF-Dateien werden akzeptiert.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `Datei zu groß (max. ${MAX_SIZE / 1024 / 1024} MB).` },
        { status: 400 }
      )
    }

    const memberId = (formData.get('member_id') as string | null) || null
    const memberName = (formData.get('member_name') as string | null)?.trim() || ''
    const memberEmail = (formData.get('member_email') as string | null)?.trim() || null
    const membershipLabel =
      (formData.get('membership_label') as string | null)?.trim() || null
    const uploadedManuallyRaw = formData.get('uploaded_manually')
    const uploadedManually =
      uploadedManuallyRaw === 'true' || uploadedManuallyRaw === '1'
    const note = (formData.get('note') as string | null)?.trim() || null

    if (!memberName) {
      return NextResponse.json(
        { error: 'member_name ist erforderlich.' },
        { status: 400 }
      )
    }

    // Datei in Storage hochladen
    const fileId = randomUUID()
    const originalName = file.name || 'vertrag.pdf'
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${fileId}.pdf`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage-Upload fehlgeschlagen:', uploadError)
      return NextResponse.json(
        {
          error: `Upload fehlgeschlagen: ${uploadError.message}. Stelle sicher, dass der Bucket "contracts" existiert (Migration 005 ausgeführt?).`,
        },
        { status: 500 }
      )
    }

    // Metadaten in contract_archive speichern
    const { data: inserted, error: insertError } = await admin
      .from('contract_archive')
      .insert({
        member_id: memberId,
        member_name: memberName,
        member_email: memberEmail,
        membership_label: membershipLabel,
        file_path: storagePath,
        file_name: safeName,
        file_size: file.size,
        uploaded_manually: uploadedManually,
        note,
      })
      .select()
      .single()

    if (insertError) {
      // Rollback: Datei wieder löschen, damit keine Waisen entstehen
      await admin.storage.from(BUCKET).remove([storagePath])
      console.error('Metadaten-Insert fehlgeschlagen:', insertError)
      return NextResponse.json(
        { error: `Speichern fehlgeschlagen: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, contract: inserted })
  } catch (error) {
    console.error('Contract-Upload Fehler:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unbekannter Fehler beim Upload',
      },
      { status: 500 }
    )
  }
}
