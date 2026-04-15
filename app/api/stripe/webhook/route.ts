import { NextRequest, NextResponse } from 'next/server'
import { stripe, SERVICE_FEE, getOrCreateServiceFeeProduct } from '@/lib/stripe'
import { upsertStripeInvoice } from '@/lib/stripe-invoice-sync'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Webhook signature oder secret fehlt' },
        { status: 400 }
      )
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      )
    } catch (err) {
      console.error('Webhook Signatur-Verifikation fehlgeschlagen:', err)
      return NextResponse.json(
        { error: 'Ungültige Webhook-Signatur' },
        { status: 400 }
      )
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const subscriptionId = session.metadata?.subscription_id

        if (!subscriptionId) {
          console.warn('checkout.session.completed ohne subscription_id metadata')
          break
        }

        const updateData: Record<string, string> = {
          status: 'active',
          payment_status: 'paid',
        }

        // Store Stripe subscription ID for recurring subscriptions
        const stripeSubId = (session as unknown as Record<string, unknown>).subscription as string | null
        if (stripeSubId) {
          updateData.stripe_subscription_id = stripeSubId

          // Set cancel_at and billing_cycle_anchor for subscriptions
          try {
            const stripeSub = await stripe.subscriptions.retrieve(stripeSubId)
            const cancelAfterMonths = stripeSub.metadata?.cancel_after_months

            if (cancelAfterMonths) {
              await stripe.subscriptions.update(stripeSubId, {
                cancel_at: Math.floor(Date.now() / 1000) + parseInt(cancelAfterMonths) * 30 * 24 * 60 * 60,
              } as Stripe.SubscriptionUpdateParams)
            }
          } catch (e) {
            console.warn('Konnte Subscription-Parameter nicht setzen:', e)
          }
        }

        await supabaseAdmin
          .from('subscriptions')
          .update(updateData)
          .eq('id', subscriptionId)

        console.log(`Subscription ${subscriptionId} aktiviert (Zahlung erfolgreich)`)
        break
      }

      case 'invoice.created': {
        // Servicepauschale: €40 alle 6 Monate automatisch auf die Rechnung drauf
        const createdInvoice = event.data.object as Stripe.Invoice
        const invoiceSubId = (createdInvoice as unknown as Record<string, unknown>).subscription as string | null

        if (invoiceSubId && createdInvoice.billing_reason === 'subscription_cycle') {
          try {
            const sub = await stripe.subscriptions.retrieve(invoiceSubId)
            const membershipId = sub.metadata?.membership_id

            // Nur für recurring Abos (keine 10er Karte)
            if (membershipId && membershipId !== '10er_karte') {
              // Berechne welcher Monat das ist seit Subscription-Start
              const anchorDate = new Date((sub.start_date || sub.created) * 1000)
              const now = new Date()
              const monthsSinceStart = (now.getFullYear() - anchorDate.getFullYear()) * 12 + (now.getMonth() - anchorDate.getMonth())

              // Alle 6 Monate die Servicepauschale draufpacken (Monat 6, 12, 18, ...)
              if (monthsSinceStart > 0 && monthsSinceStart % SERVICE_FEE.intervalMonths === 0) {
                const productId = await getOrCreateServiceFeeProduct()

                await stripe.invoiceItems.create({
                  customer: createdInvoice.customer as string,
                  invoice: createdInvoice.id,
                  amount: SERVICE_FEE.unitAmount,
                  currency: 'eur',
                  description: `${SERVICE_FEE.name} (halbjährlich)`,
                  metadata: {
                    type: 'service_fee',
                    product_id: productId,
                  },
                })

                console.log(`Servicepauschale (${SERVICE_FEE.unitAmount / 100}€) hinzugefügt für Subscription ${invoiceSubId} (Monat ${monthsSinceStart})`)
              }
            }
          } catch (e) {
            console.warn('Servicepauschale konnte nicht hinzugefügt werden:', e)
          }
        }
        break
      }

      case 'invoice.paid':
      case 'invoice.finalized': {
        // Stripe Invoice in lokale DB synchronisieren
        const syncInvoice = event.data.object as Stripe.Invoice
        try {
          await upsertStripeInvoice(syncInvoice.id)
          console.log(`Stripe Invoice ${syncInvoice.id} synchronisiert (${event.type})`)
        } catch (e) {
          console.warn('Invoice Sync fehlgeschlagen:', e)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const stripeSubId = (invoice as unknown as Record<string, unknown>).subscription as string | null

        if (stripeSubId) {
          await supabaseAdmin
            .from('subscriptions')
            .update({ payment_status: 'failed' })
            .eq('stripe_subscription_id', stripeSubId)

          console.log(`Zahlung fehlgeschlagen für Stripe Subscription ${stripeSubId}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const subId = subscription.metadata?.subscription_id

        if (subId) {
          await supabaseAdmin
            .from('subscriptions')
            .update({ status: 'cancelled', payment_status: 'cancelled' })
            .eq('id', subId)

          console.log(`Subscription ${subId} gekündigt`)
        }
        break
      }

      default:
        // Unhandled event type
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook Verarbeitung fehlgeschlagen:', error)
    return NextResponse.json(
      { error: 'Webhook Verarbeitung fehlgeschlagen' },
      { status: 500 }
    )
  }
}
