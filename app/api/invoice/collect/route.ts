import { NextRequest, NextResponse } from 'next/server'
import { safeCollectInvoice } from '@/lib/stripe-collect'
import { requireAdminClient } from '@/lib/admin-auth'

/**
 * Zieht eine offene Stripe-Rechnung erneut per SEPA-Lastschrift ein
 * (stripe.invoices.pay). Für offene/überfällige Rechnungen aktiver Abos,
 * deren Erst-/Folge-Abbuchung fehlgeschlagen ist.
 *
 * Body: { stripeInvoiceId: string }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminClient(request)
  if (!auth.ok) return auth.response

  try {
    const { stripeInvoiceId } = await request.json()
    if (!stripeInvoiceId) {
      return NextResponse.json({ error: 'stripeInvoiceId ist erforderlich' }, { status: 400 })
    }

    // Sicherer Einzug (verhindert Doppelbelastung, siehe lib/stripe-collect.ts).
    const outcome = await safeCollectInvoice(stripeInvoiceId)
    if (outcome.result === 'failed') {
      return NextResponse.json({ error: `Einzug fehlgeschlagen: ${outcome.reason}` }, { status: 500 })
    }
    if (outcome.result === 'skipped') {
      return NextResponse.json({ ok: true, skipped: true, reason: outcome.reason })
    }
    return NextResponse.json({ ok: true, collected: true })
  } catch (error) {
    // Stripe wirft, wenn die Lastschrift sofort scheitert (z.B. kein Mandat,
    // Konto gedeckt erst in Tagen) — Fehler an den Coach durchreichen.
    const msg = error instanceof Error ? error.message : 'Unbekannter Fehler'
    console.error('Rechnung einziehen fehlgeschlagen:', error)
    return NextResponse.json({ error: `Einzug fehlgeschlagen: ${msg}` }, { status: 500 })
  }
}
