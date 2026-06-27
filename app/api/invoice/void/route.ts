import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { upsertStripeInvoice } from '@/lib/stripe-invoice-sync'
import { requireAdminClient } from '@/lib/admin-auth'

/**
 * Storniert (voided) eine offene Stripe-Rechnung als uneinbringlich.
 * Für offene Beträge toter Abos, die realistisch nicht mehr eingezogen werden.
 * Stripe-Status void → wird lokal über upsertStripeInvoice auf 'cancelled' gemappt.
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

    // Nur offene/finalisierte Rechnungen lassen sich voiden. Stripe wirft sonst.
    const invoice = await stripe.invoices.voidInvoice(stripeInvoiceId)

    try {
      await upsertStripeInvoice(stripeInvoiceId)
    } catch (e) {
      console.warn('Invoice-Sync nach Stornierung fehlgeschlagen:', e)
    }

    return NextResponse.json({ ok: true, status: invoice.status })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unbekannter Fehler'
    console.error('Rechnung stornieren fehlgeschlagen:', error)
    return NextResponse.json({ error: `Stornierung fehlgeschlagen: ${msg}` }, { status: 500 })
  }
}
