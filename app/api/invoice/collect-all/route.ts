import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { safeCollectInvoice } from '@/lib/stripe-collect'
import { requireAdminClient } from '@/lib/admin-auth'

/**
 * R5: Zieht ALLE offenen Stripe-Rechnungen (Rückstände) sicher ein.
 * Optional auf einen Kunden begrenzt via { stripeCustomerId }.
 *
 * DOPPELBUCHUNGS-SCHUTZ auf ZWEI Ebenen:
 *  1. KUNDEN-GUARD (hier): Hat ein Kunde IRGENDEINE Rechnung mit laufender/ausstehender
 *     Zahlung (PaymentIntent processing/requires_action) ODER einem von Stripe geplanten
 *     Retry (next_payment_attempt), wird der GESAMTE Kunde übersprungen — es wird KEINE
 *     einzige seiner Rechnungen angestoßen. Kein zweiter SEPA-Auftrag, solange Stripe dran ist.
 *  2. RECHNUNGS-GUARD: Jede tatsächlich eingezogene Rechnung läuft zusätzlich durch
 *     safeCollectInvoice() (frische Prüfung + Idempotency-Key).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminClient(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json().catch(() => ({}))
    const stripeCustomerId: string | undefined = body?.stripeCustomerId

    const listParams: Stripe.InvoiceListParams = {
      status: 'open',
      limit: 100,
      expand: ['data.payment_intent'],
    }
    if (stripeCustomerId) listParams.customer = stripeCustomerId

    // Offene Rechnungen nach Kunde gruppieren + erkennen, ob beim Kunden gerade etwas läuft.
    const byCustomer = new Map<string, { ids: string[]; busy: boolean }>()
    for await (const inv of stripe.invoices.list(listParams)) {
      const remaining = inv.amount_due - (inv.amount_paid || 0)
      if (remaining <= 0) continue
      const cid = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id
      if (!cid) continue

      const piRef = (inv as unknown as { payment_intent?: Stripe.PaymentIntent | string | null }).payment_intent
      const pi = piRef && typeof piRef !== 'string' ? piRef : null
      // Läuft/geplant? → Kunde ist "busy".
      const inFlight = !!inv.next_payment_attempt
        || (!!pi && ['processing', 'requires_action', 'requires_confirmation', 'succeeded'].includes(pi.status))

      const e = byCustomer.get(cid) || { ids: [], busy: false }
      e.ids.push(inv.id)
      if (inFlight) e.busy = true
      byCustomer.set(cid, e)
    }

    let collected = 0
    let skipped = 0
    let failed = 0
    let skippedCustomers = 0
    const errors: string[] = []

    for (const e of Array.from(byCustomer.values())) {
      // KUNDEN-GUARD: läuft beim Kunden etwas → GAR NICHTS anfassen.
      if (e.busy) {
        skipped += e.ids.length
        skippedCustomers++
        continue
      }
      for (const id of e.ids) {
        const outcome = await safeCollectInvoice(id)
        if (outcome.result === 'collected') collected++
        else if (outcome.result === 'skipped') skipped++
        else { failed++; errors.push(`${id}: ${outcome.reason}`) }
      }
    }

    return NextResponse.json({ ok: true, collected, skipped, skippedCustomers, failed, errors })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unbekannter Fehler'
    console.error('Sammel-Einzug fehlgeschlagen:', error)
    return NextResponse.json({ error: `Sammel-Einzug fehlgeschlagen: ${msg}` }, { status: 500 })
  }
}
