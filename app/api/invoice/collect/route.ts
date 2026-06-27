import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { upsertStripeInvoice } from '@/lib/stripe-invoice-sync'
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

    // Erneuten Einzug auslösen. Stripe nutzt das hinterlegte SEPA-Mandat des Customers.
    const invoice = await stripe.invoices.pay(stripeInvoiceId)

    // Lokale invoices-Tabelle direkt mit dem neuen Stripe-Status abgleichen.
    try {
      await upsertStripeInvoice(stripeInvoiceId)
    } catch (e) {
      console.warn('Invoice-Sync nach Einzug fehlgeschlagen:', e)
    }

    return NextResponse.json({ ok: true, status: invoice.status })
  } catch (error) {
    // Stripe wirft, wenn die Lastschrift sofort scheitert (z.B. kein Mandat,
    // Konto gedeckt erst in Tagen) — Fehler an den Coach durchreichen.
    const msg = error instanceof Error ? error.message : 'Unbekannter Fehler'
    console.error('Rechnung einziehen fehlgeschlagen:', error)
    return NextResponse.json({ error: `Einzug fehlgeschlagen: ${msg}` }, { status: 500 })
  }
}
