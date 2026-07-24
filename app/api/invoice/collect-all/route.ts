import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { safeCollectInvoice } from '@/lib/stripe-collect'
import { requireAdminClient } from '@/lib/admin-auth'

/**
 * R5: Zieht ALLE offenen Stripe-Rechnungen (Rückstände) sicher ein.
 * Optional auf einen Kunden begrenzt via { stripeCustomerId }.
 *
 * Jede Rechnung geht durch safeCollectInvoice() — dort wird pro Rechnung FRISCH geprüft,
 * ob Stripe bereits selbst einzieht (geplanter Retry oder laufender PaymentIntent). Solche
 * Rechnungen werden übersprungen. Doppelbelastung ist damit ausgeschlossen.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminClient(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json().catch(() => ({}))
    const stripeCustomerId: string | undefined = body?.stripeCustomerId

    const listParams: import('stripe').default.InvoiceListParams = { status: 'open', limit: 100 }
    if (stripeCustomerId) listParams.customer = stripeCustomerId

    // Erst alle offenen IDs einsammeln, dann seriell sicher einziehen.
    const ids: string[] = []
    for await (const inv of stripe.invoices.list(listParams)) {
      ids.push(inv.id)
    }

    let collected = 0
    let skipped = 0
    let failed = 0
    const errors: string[] = []

    for (const id of ids) {
      const outcome = await safeCollectInvoice(id)
      if (outcome.result === 'collected') collected++
      else if (outcome.result === 'skipped') skipped++
      else { failed++; errors.push(`${id}: ${outcome.reason}`) }
    }

    return NextResponse.json({ ok: true, collected, skipped, failed, errors })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unbekannter Fehler'
    console.error('Sammel-Einzug fehlgeschlagen:', error)
    return NextResponse.json({ error: `Sammel-Einzug fehlgeschlagen: ${msg}` }, { status: 500 })
  }
}
