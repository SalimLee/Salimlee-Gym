import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { syncStripeInvoices } from '@/lib/stripe-invoice-sync'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * Nachträglicher Re-Sync:
 * 1. Zieht alle aktuellen Stripe-Invoices in die invoices Tabelle (inkl. 10er-Karten mit invoice_creation)
 * 2. Gleicht den Status aller pending Subscriptions mit Stripe ab
 *
 * Wird vom Admin manuell getriggert, wenn Webhook-Events verpasst wurden.
 */
export async function POST() {
  try {
    // 1. Invoices syncen (90 Tage zurück)
    const invoiceResult = await syncStripeInvoices(90)

    // 2. Alle Subscriptions mit Stripe abgleichen, die noch pending sind oder eine Stripe-ID haben
    const { data: subs } = await supabaseAdmin
      .from('subscriptions')
      .select('id, status, payment_status, stripe_subscription_id, stripe_checkout_session_id, stripe_customer_id')
      .or('stripe_subscription_id.not.is.null,stripe_checkout_session_id.not.is.null')

    const subResult = { checked: 0, updated: 0, errors: [] as string[] }

    for (const sub of subs || []) {
      subResult.checked++
      try {
        const updateData: Record<string, string> = {}

        // A) Falls Stripe-Subscription existiert → echten Status holen
        if (sub.stripe_subscription_id) {
          const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
          if (stripeSub.status === 'active' || stripeSub.status === 'trialing') {
            if (sub.status !== 'active') updateData.status = 'active'
            if (sub.payment_status !== 'paid') updateData.payment_status = 'paid'
          } else if (stripeSub.status === 'canceled') {
            if (sub.status !== 'cancelled') updateData.status = 'cancelled'
          } else if (stripeSub.status === 'past_due' || stripeSub.status === 'unpaid') {
            updateData.payment_status = 'failed'
          }
        }
        // B) Nur Checkout-Session → Session-Status prüfen
        else if (sub.stripe_checkout_session_id) {
          const session = await stripe.checkout.sessions.retrieve(sub.stripe_checkout_session_id)

          // PaymentIntent-Status prüfen (auch für SEPA async)
          let piStatus: string | null = null
          if (session.payment_intent) {
            const piId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id
            const pi = await stripe.paymentIntents.retrieve(piId)
            piStatus = pi.status
          }

          if (session.payment_status === 'paid' || piStatus === 'succeeded') {
            if (sub.status !== 'active') updateData.status = 'active'
            if (sub.payment_status !== 'paid') updateData.payment_status = 'paid'
          } else if (piStatus === 'processing' || session.payment_status === 'unpaid') {
            if (sub.payment_status !== 'processing') updateData.payment_status = 'processing'
          }

          // Falls durch Session eine Subscription entstanden ist, speichern
          if (session.subscription) {
            const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id
            updateData.stripe_subscription_id = subId
          }
        }

        if (Object.keys(updateData).length > 0) {
          const { error } = await supabaseAdmin
            .from('subscriptions')
            .update(updateData)
            .eq('id', sub.id)
          if (error) {
            subResult.errors.push(`${sub.id}: ${error.message}`)
          } else {
            subResult.updated++
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        subResult.errors.push(`${sub.id}: ${msg}`)
      }
    }

    return NextResponse.json({
      ok: true,
      invoices: invoiceResult,
      subscriptions: subResult,
    })
  } catch (error) {
    console.error('Stripe Re-Sync fehlgeschlagen:', error)
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler'
    return NextResponse.json({ error: `Re-Sync fehlgeschlagen: ${message}` }, { status: 500 })
  }
}
