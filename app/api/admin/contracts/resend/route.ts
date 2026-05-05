import { NextRequest, NextResponse } from 'next/server'
import { requireAdminClient } from '@/lib/admin-auth'
import { findMembershipId } from '@/lib/stripe'

const BUCKET = 'contracts'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminClient(request)
    if (!auth.ok) return auth.response
    const { admin } = auth

    const body = await request.json().catch(() => ({}))
    const { archive_id, new_email, update_member_email } = body as {
      archive_id?: string
      new_email?: string
      update_member_email?: boolean
    }

    if (!archive_id || !new_email) {
      return NextResponse.json(
        { error: 'archive_id und new_email sind erforderlich.' },
        { status: 400 }
      )
    }

    // 1. Archiv-Eintrag laden
    const { data: archiveRow, error: archiveErr } = await admin
      .from('contract_archive')
      .select('*')
      .eq('id', archive_id)
      .single()

    if (archiveErr || !archiveRow) {
      return NextResponse.json(
        { error: 'Archiv-Eintrag nicht gefunden.' },
        { status: 404 }
      )
    }

    // 2. PDF aus Storage herunterladen
    const { data: fileData, error: fileErr } = await admin.storage
      .from(BUCKET)
      .download(archiveRow.file_path)

    if (fileErr || !fileData) {
      return NextResponse.json(
        { error: `PDF konnte nicht geladen werden: ${fileErr?.message || 'Datei nicht gefunden'}` },
        { status: 500 }
      )
    }

    const arrayBuffer = await fileData.arrayBuffer()
    const pdfBase64 = Buffer.from(arrayBuffer).toString('base64')

    // 3. Subscription suchen (für Stripe-Checkout)
    let checkoutUrl: string | null = null
    const memberId = archiveRow.member_id

    if (memberId) {
      const { data: subs } = await admin
        .from('subscriptions')
        .select('id, name, status')
        .eq('member_id', memberId)
        .in('status', ['pending', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)

      const sub = subs?.[0]

      if (sub) {
        const membershipLabel = archiveRow.membership_label || sub.name || ''
        const membershipId = findMembershipId(membershipLabel)

        if (membershipId) {
          try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
            const checkoutRes = await fetch(`${baseUrl}/api/stripe/create-checkout`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                subscriptionId: sub.id,
                memberEmail: new_email,
                memberName: archiveRow.member_name,
                membershipId,
              }),
            })
            const checkoutResult = await checkoutRes.json()
            if (checkoutRes.ok) {
              checkoutUrl = checkoutResult.checkoutUrl
            } else {
              console.warn('Stripe Checkout fehlgeschlagen:', checkoutResult.error)
            }
          } catch (e) {
            console.warn('Stripe Checkout Fehler:', e)
          }
        }
      }
    }

    // 4. Vertrag per E-Mail senden (gleicher Endpunkt wie Erstversand)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const sendRes = await fetch(`${baseUrl}/api/contract/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pdfBase64,
        memberEmail: new_email,
        memberName: archiveRow.member_name,
        membershipLabel: archiveRow.membership_label,
        checkoutUrl,
      }),
    })

    const sendResult = await sendRes.json()
    if (!sendRes.ok) {
      return NextResponse.json(
        { error: sendResult.error || 'E-Mail-Versand fehlgeschlagen.' },
        { status: 500 }
      )
    }

    // 5. Optional: E-Mail beim Mitglied aktualisieren
    if (update_member_email && memberId) {
      await admin
        .from('members')
        .update({ email: new_email })
        .eq('id', memberId)
    }

    // 6. E-Mail im Archiv-Eintrag aktualisieren
    await admin
      .from('contract_archive')
      .update({ member_email: new_email })
      .eq('id', archive_id)

    return NextResponse.json({
      success: true,
      has_checkout_url: !!checkoutUrl,
    })
  } catch (error) {
    console.error('Contract-Resend Fehler:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unbekannter Fehler beim erneuten Senden',
      },
      { status: 500 }
    )
  }
}
