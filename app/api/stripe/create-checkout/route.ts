import { NextRequest, NextResponse } from 'next/server'
import { stripe, getOrCreateStripePrice, getOrCreateStripeCustomer, getOrCreateTaxRate, MEMBERSHIP_STRIPE_MAP } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe ist nicht konfiguriert (STRIPE_SECRET_KEY fehlt)' },
        { status: 500 }
      )
    }

    const { subscriptionId, memberEmail, memberName, membershipId } = await request.json()

    if (!subscriptionId || !memberEmail || !memberName || !membershipId) {
      return NextResponse.json(
        { error: 'subscriptionId, memberEmail, memberName und membershipId sind erforderlich' },
        { status: 400 }
      )
    }

    const config = MEMBERSHIP_STRIPE_MAP[membershipId]
    if (!config) {
      return NextResponse.json(
        { error: `Unbekannte Mitgliedschaft: ${membershipId}` },
        { status: 400 }
      )
    }

    // Get or create Stripe price, customer, and tax rate
    const [priceId, customerId, taxRateId] = await Promise.all([
      getOrCreateStripePrice(membershipId),
      getOrCreateStripeCustomer(memberEmail, memberName),
      getOrCreateTaxRate(),
    ])

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    // Build checkout session params
    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      customer: customerId,
      locale: 'de',
      success_url: `${baseUrl}/zahlung-erfolgreich?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/zahlung-abgebrochen`,
      metadata: {
        subscription_id: subscriptionId,
        membership_id: membershipId,
      },
    }

    if (config.recurring) {
      // Subscription mode for recurring memberships
      sessionParams.mode = 'subscription'
      sessionParams.line_items = [{ price: priceId, quantity: 1, tax_rates: [taxRateId] }]

      // Trial bis zum 1. des nächsten Monats — erste Abbuchung am 1.
      const now = new Date()
      const isFirstOfMonth = now.getDate() === 1
      const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      const trialEnd = isFirstOfMonth ? undefined : Math.floor(firstOfNextMonth.getTime() / 1000)

      sessionParams.subscription_data = {
        ...(trialEnd ? { trial_end: trialEnd } : {}),
        default_tax_rates: [taxRateId],
        metadata: {
          subscription_id: subscriptionId,
          membership_id: membershipId,
          ...(config.intervalCount ? { cancel_after_months: String(config.intervalCount) } : {}),
        },
      }
    } else {
      // Payment mode for one-time purchases (10er Karte)
      sessionParams.mode = 'payment'
      sessionParams.line_items = [{ price: priceId, quantity: 1, tax_rates: [taxRateId] }]
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    // Update subscription with Stripe IDs
    await supabaseAdmin
      .from('subscriptions')
      .update({
        stripe_checkout_session_id: session.id,
        stripe_customer_id: customerId,
      })
      .eq('id', subscriptionId)

    return NextResponse.json({ checkoutUrl: session.url })
  } catch (error) {
    console.error('Stripe Checkout Session Erstellung fehlgeschlagen:', error)
    return NextResponse.json(
      { error: 'Checkout Session konnte nicht erstellt werden' },
      { status: 500 }
    )
  }
}
