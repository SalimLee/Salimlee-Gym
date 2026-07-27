import { NextRequest, NextResponse } from 'next/server'
import { buildContractReminderEmail } from '@/lib/contract-reminder-email'

/**
 * Vertrags-Erinnerung: informiert den Kunden, dass die MINDESTVERTRAGSLAUFZEIT bald endet
 * und die Mitgliedschaft danach automatisch monatlich (monatlich kündbar) weiterläuft.
 *
 * WICHTIG: Diese Route fasst STRIPE NICHT an und ändert KEINE Subscription/kein Abo.
 * Sie verschickt ausschließlich eine E-Mail (Resend). Nichts Aktives wird gekippt.
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Resend nicht konfiguriert' }, { status: 500 })
    }
    const { memberEmail, memberName, subscriptionName, endDate } = await request.json()
    if (!memberEmail || !memberName) {
      return NextResponse.json({ error: 'memberEmail und memberName sind erforderlich' }, { status: 400 })
    }

    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const FROM = process.env.EMAIL_FROM || 'Salim Lee Gym <noreply@salimlee-gym.de>'
    const { subject, html } = buildContractReminderEmail({ memberName, subscriptionName, endDate })

    const { error } = await resend.emails.send({ from: FROM, to: memberEmail, subject, html })

    if (error) {
      return NextResponse.json({ error: `E-Mail fehlgeschlagen: ${error.message}` }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unbekannter Fehler'
    return NextResponse.json({ error: `Vertrags-Erinnerung: ${msg}` }, { status: 500 })
  }
}
