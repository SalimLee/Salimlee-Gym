import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
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
            const billingAnchorDay = stripeSub.metadata?.billing_anchor_day

            const updateParams: Record<string, unknown> = {}

            if (cancelAfterMonths) {
              updateParams.cancel_at = Math.floor(Date.now() / 1000) + parseInt(cancelAfterMonths) * 30 * 24 * 60 * 60
            }

            if (billingAnchorDay) {
              // Set billing_cycle_anchor to the next occurrence of the anchor day
              const anchorDay = parseInt(billingAnchorDay)
              const now = new Date()
              const anchorDate = new Date(now.getFullYear(), now.getMonth(), anchorDay)
              if (anchorDate <= now) {
                anchorDate.setMonth(anchorDate.getMonth() + 1)
              }
              updateParams.billing_cycle_anchor = Math.floor(anchorDate.getTime() / 1000)
              updateParams.proration_behavior = 'create_prorations'
            }

            if (Object.keys(updateParams).length > 0) {
              await stripe.subscriptions.update(stripeSubId, updateParams as Stripe.SubscriptionUpdateParams)
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
