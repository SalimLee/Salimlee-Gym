import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

/**
 * Manages Stripe subscription lifecycle: pause, resume, cancel.
 * Called from the admin SubscriptionsTab when a coach changes subscription status.
 */
export async function POST(request: NextRequest) {
  try {
    const { action, stripeSubscriptionId } = await request.json()

    if (!stripeSubscriptionId) {
      // No Stripe subscription linked (e.g., manually created sub) — skip silently
      return NextResponse.json({ ok: true, skipped: true })
    }

    if (!['pause', 'resume', 'cancel'].includes(action)) {
      return NextResponse.json({ error: 'Ungültige Aktion' }, { status: 400 })
    }

    // Verify subscription exists on Stripe
    let stripeSub
    try {
      stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId)
    } catch {
      // Subscription doesn't exist on Stripe (already deleted, test data, etc.)
      return NextResponse.json({ ok: true, skipped: true, reason: 'Stripe-Subscription nicht gefunden' })
    }

    if (action === 'cancel') {
      // Cancel immediately — no more charges
      if (stripeSub.status !== 'canceled') {
        await stripe.subscriptions.cancel(stripeSubscriptionId, {
          prorate: true,
        })
      }
      return NextResponse.json({ ok: true, action: 'cancelled' })
    }

    if (action === 'pause') {
      // Pause collection — subscription stays but no invoices are created
      await stripe.subscriptions.update(stripeSubscriptionId, {
        pause_collection: { behavior: 'void' },
      })
      return NextResponse.json({ ok: true, action: 'paused' })
    }

    if (action === 'resume') {
      // Resume collection — invoices will be created again
      await stripe.subscriptions.update(stripeSubscriptionId, {
        pause_collection: null as unknown as undefined,
      })
      return NextResponse.json({ ok: true, action: 'resumed' })
    }

    return NextResponse.json({ error: 'Unbekannte Aktion' }, { status: 400 })
  } catch (error) {
    console.error('Stripe-Aktion fehlgeschlagen:', error)
    return NextResponse.json(
      { error: 'Stripe-Aktion fehlgeschlagen' },
      { status: 500 }
    )
  }
}
