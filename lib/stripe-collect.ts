import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { upsertStripeInvoice } from '@/lib/stripe-invoice-sync'

export type CollectOutcome = {
  invoiceId: string
  result: 'collected' | 'skipped' | 'failed'
  reason?: string
}

/**
 * Zieht EINE offene Stripe-Rechnung SICHER erneut ein — ohne Doppelbelastungs-Risiko.
 *
 * Hintergrund: Stripe versucht bei fehlgeschlagenen Zahlungen ggf. selbst alle paar Tage
 * erneut einzuziehen (Smart Retries). Würde der Coach in diesem Fenster manuell "einziehen",
 * könnte parallel abgebucht werden. Deshalb:
 *
 *   1. Rechnung wird IMMER frisch geladen (inkl. PaymentIntent) — Listen-Daten sind evtl. veraltet.
 *   2. Übersprungen wird, sobald Stripe schon dran ist:
 *        - status != 'open'  (bezahlt/void/uncollectible)
 *        - kein Restbetrag
 *        - next_payment_attempt gesetzt  → Stripe hat einen Retry GEPLANT
 *        - PaymentIntent processing / requires_action / requires_confirmation / succeeded
 *          → ein Einzug LÄUFT bereits (SEPA braucht Tage)
 *   3. Nur wenn der letzte Versuch definitiv fehlgeschlagen ist (kein PI / requires_payment_method /
 *      canceled) wird gezahlt — mit Idempotency-Key, damit ein Doppelklick oder Endpoint-Retry
 *      innerhalb von 24 h NICHT doppelt bucht.
 *
 * Ergebnis: Stripe hält pro Rechnung ohnehin nur EINEN PaymentIntent-Lebenszyklus — zusammen mit
 * diesen Guards ist eine Doppelbuchung ausgeschlossen.
 */
export async function safeCollectInvoice(stripeInvoiceId: string): Promise<CollectOutcome> {
  let inv: Stripe.Invoice
  try {
    inv = await stripe.invoices.retrieve(stripeInvoiceId, { expand: ['payment_intent'] })
  } catch (e) {
    return { invoiceId: stripeInvoiceId, result: 'failed', reason: e instanceof Error ? e.message : String(e) }
  }

  if (inv.status !== 'open') {
    return { invoiceId: stripeInvoiceId, result: 'skipped', reason: `status=${inv.status}` }
  }
  const remaining = inv.amount_due - (inv.amount_paid || 0)
  if (remaining <= 0) {
    return { invoiceId: stripeInvoiceId, result: 'skipped', reason: 'kein Restbetrag' }
  }
  // Stripe hat einen automatischen Retry geplant → NICHT eingreifen.
  if (inv.next_payment_attempt) {
    return { invoiceId: stripeInvoiceId, result: 'skipped', reason: 'Stripe-Retry geplant' }
  }

  // PaymentIntent-Zustand prüfen (expandiert geladen).
  const piRef = (inv as unknown as { payment_intent?: Stripe.PaymentIntent | string | null }).payment_intent
  const pi = piRef && typeof piRef !== 'string' ? piRef : null
  if (pi && ['processing', 'requires_action', 'requires_confirmation', 'succeeded'].includes(pi.status)) {
    return { invoiceId: stripeInvoiceId, result: 'skipped', reason: `Einzug läuft (PI=${pi.status})` }
  }

  // Sicherer Zeitpunkt: nichts in Arbeit, kein geplanter Retry → jetzt einziehen.
  try {
    await stripe.invoices.pay(
      stripeInvoiceId,
      {},
      { idempotencyKey: `collect-${stripeInvoiceId}-att${inv.attempt_count || 0}` }
    )
    try { await upsertStripeInvoice(stripeInvoiceId) } catch { /* Sync best-effort */ }
    return { invoiceId: stripeInvoiceId, result: 'collected' }
  } catch (e) {
    return { invoiceId: stripeInvoiceId, result: 'failed', reason: e instanceof Error ? e.message : String(e) }
  }
}
