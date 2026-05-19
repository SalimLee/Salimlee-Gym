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

    // 2. Alle Abos laden — wir prüfen sowohl verknüpfte als auch unverknüpfte
    //    (manche wurden mit Anon-Key erstellt, wo RLS die Stripe-ID-Writes silently verwarf)
    const { data: subs } = await supabaseAdmin
      .from('subscriptions')
      .select(`
        id, status, payment_status, name, member_id,
        stripe_subscription_id, stripe_checkout_session_id, stripe_customer_id,
        members:member_id ( email, name )
      `)

    const subResult = { checked: 0, updated: 0, errors: [] as string[] }

    for (const sub of (subs || []) as Array<Record<string, unknown> & { members?: { email?: string; name?: string } | { email?: string; name?: string }[] }>) {
      subResult.checked++
      try {
        const updateData: Record<string, string> = {}
        // Supabase kann members als Array zurückgeben — beides abdecken
        const member = Array.isArray(sub.members) ? sub.members[0] : sub.members
        const memberEmail = member?.email

        const stripeSubscriptionId = sub.stripe_subscription_id as string | null
        const stripeCheckoutSessionId = sub.stripe_checkout_session_id as string | null

        // A) Falls Stripe-Subscription existiert → echten Status holen
        if (stripeSubscriptionId) {
          const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId)
          if (stripeSub.status === 'active' || stripeSub.status === 'trialing') {
            if (sub.status !== 'active') updateData.status = 'active'
            if (sub.payment_status !== 'paid') updateData.payment_status = 'paid'
          } else if (stripeSub.status === 'canceled') {
            // WICHTIG: nur als 'cancelled' markieren, wenn die Sub vorher mal aktiv war.
            // Lokal 'pending' bedeutet "Coach hat angelegt, Zahlung noch offen" — auch wenn die
            // Stripe-Sub durch eine fehlgeschlagene Initialzahlung 'canceled' wird, soll der
            // Coach die Sub im Dashboard sehen und manuell entscheiden (z.B. Reminder erneut senden).
            if (sub.status === 'active' || sub.status === 'paused') {
              updateData.status = 'cancelled'
            }
            // pending oder schon cancelled → nicht überschreiben
          } else if (stripeSub.status === 'past_due' || stripeSub.status === 'unpaid') {
            updateData.payment_status = 'failed'
          } else if (stripeSub.status === 'incomplete' || stripeSub.status === 'incomplete_expired') {
            // Initialzahlung wurde nie erfolgreich → lokal als pending halten
            if (sub.status !== 'pending') updateData.status = 'pending'
            updateData.payment_status = 'failed'
          }
        }
        // B) Nur Checkout-Session → Session-Status prüfen
        else if (stripeCheckoutSessionId) {
          const session = await stripe.checkout.sessions.retrieve(stripeCheckoutSessionId)

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
        // C) Kein Stripe-Link in DB → via Customer-Email in Stripe suchen
        //    (nötig für Abos, wo RLS die ID-Writes verwarf)
        else if (memberEmail) {
          const customers = await stripe.customers.list({ email: memberEmail, limit: 5 })
          for (const customer of customers.data) {
            // Alle Checkout-Sessions dieses Customers durchsuchen
            const sessions = await stripe.checkout.sessions.list({ customer: customer.id, limit: 20 })
            const paidSession = sessions.data.find(s => s.payment_status === 'paid')
            const unpaidSession = sessions.data.find(s => s.payment_status === 'unpaid' && s.status === 'complete')

            if (paidSession) {
              updateData.stripe_customer_id = customer.id
              updateData.stripe_checkout_session_id = paidSession.id
              updateData.status = 'active'
              updateData.payment_status = 'paid'
              if (paidSession.subscription) {
                const subId = typeof paidSession.subscription === 'string' ? paidSession.subscription : paidSession.subscription.id
                updateData.stripe_subscription_id = subId
              }
              break
            } else if (unpaidSession) {
              updateData.stripe_customer_id = customer.id
              updateData.stripe_checkout_session_id = unpaidSession.id
              updateData.payment_status = 'processing'
              break
            }
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
