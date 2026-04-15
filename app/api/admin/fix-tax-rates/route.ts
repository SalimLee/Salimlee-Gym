import { NextRequest, NextResponse } from 'next/server'
import { requireAdminClient } from '@/lib/admin-auth'
import { stripe, getOrCreateTaxRate } from '@/lib/stripe'

/**
 * Einmalige Migration: Fügt 19% MwSt Tax Rate zu allen bestehenden
 * Stripe-Subscriptions hinzu die noch keinen haben.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminClient(request)
  if (!auth.ok) return auth.response

  try {
    const taxRateId = await getOrCreateTaxRate()

    // Alle Subscriptions mit stripe_subscription_id holen
    const { data: subs } = await auth.admin
      .from('subscriptions')
      .select('stripe_subscription_id')
      .not('stripe_subscription_id', 'is', null)
      .in('status', ['active', 'paused'])

    if (!subs || subs.length === 0) {
      return NextResponse.json({ message: 'Keine aktiven Stripe-Subscriptions gefunden', updated: 0 })
    }

    let updated = 0
    let skipped = 0
    const errors: string[] = []

    for (const sub of subs) {
      const stripeSubId = sub.stripe_subscription_id
      if (!stripeSubId) continue

      try {
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubId)

        if (stripeSub.status === 'canceled') {
          skipped++
          continue
        }

        // Prüfe ob bereits Tax Rate vorhanden
        const hasDefaultTax = stripeSub.default_tax_rates && stripeSub.default_tax_rates.length > 0
        if (hasDefaultTax) {
          skipped++
          continue
        }

        // Tax Rate auf Subscription setzen
        await stripe.subscriptions.update(stripeSubId, {
          default_tax_rates: [taxRateId],
        })

        updated++
        console.log(`Tax Rate hinzugefügt für Subscription ${stripeSubId}`)
      } catch (e) {
        errors.push(`${stripeSubId}: ${e}`)
      }
    }

    return NextResponse.json({ updated, skipped, errors, taxRateId })
  } catch (error) {
    console.error('Tax Rate Migration fehlgeschlagen:', error)
    return NextResponse.json({ error: 'Migration fehlgeschlagen' }, { status: 500 })
  }
}
