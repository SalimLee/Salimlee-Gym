import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { upsertStripeInvoice } from '@/lib/stripe-invoice-sync'
import { requireAdminClient } from '@/lib/admin-auth'

/**
 * R5: Zieht ALLE offenen Stripe-Rechnungen erneut per SEPA ein (Rückstände sammeln).
 * Optional auf einen Kunden begrenzt via { stripeCustomerId }.
 *
 * SICHERHEIT gegen Doppelbelastung: Rechnungen mit geplantem Retry
 * (next_payment_attempt gesetzt) oder laufendem PaymentIntent ('processing'/
 * 'requires_action') werden ÜBERSPRUNGEN — dort zieht Stripe bereits selbst ein.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminClient(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json().catch(() => ({}))
    const stripeCustomerId: string | undefined = body?.stripeCustomerId

    const listParams: import('stripe').default.InvoiceListParams = { status: 'open', limit: 100 }
    if (stripeCustomerId) listParams.customer = stripeCustomerId

    let collected = 0
    let skipped = 0
    let failed = 0
    const errors: string[] = []

    for await (const inv of stripe.invoices.list(listParams)) {
      const remaining = inv.amount_due - (inv.amount_paid || 0)
      if (remaining <= 0) { skipped++; continue }

      // Guard: läuft bei Stripe schon ein Einzug? Dann NICHT nochmal anstoßen.
      let inFlight = !!inv.next_payment_attempt
      if (!inFlight) {
        const piRef = (inv as unknown as Record<string, unknown>).payment_intent as string | { id?: string } | null
        const piId = typeof piRef === 'string' ? piRef : piRef?.id
        if (piId) {
          try {
            const pi = await stripe.paymentIntents.retrieve(piId)
            if (pi.status === 'processing' || pi.status === 'requires_action') inFlight = true
          } catch { /* ignore */ }
        }
      }
      if (inFlight) { skipped++; continue }

      try {
        await stripe.invoices.pay(inv.id)
        collected++
        try { await upsertStripeInvoice(inv.id) } catch { /* sync best-effort */ }
      } catch (e) {
        failed++
        errors.push(`${inv.number || inv.id}: ${e instanceof Error ? e.message : e}`)
      }
    }

    return NextResponse.json({ ok: true, collected, skipped, failed, errors })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unbekannter Fehler'
    console.error('Sammel-Einzug fehlgeschlagen:', error)
    return NextResponse.json({ error: `Sammel-Einzug fehlgeschlagen: ${msg}` }, { status: 500 })
  }
}
