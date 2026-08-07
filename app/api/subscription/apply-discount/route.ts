import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * Wendet ein Sonderangebot (Aktionspreis für N Monate) DIREKT auf ein bestehendes,
 * aktives Stripe-Abo an — als repeating Coupon (amount_off = Tarifpreis − Aktionspreis).
 * Danach zahlt der Kunde N Monate den Aktionspreis, danach automatisch wieder den vollen
 * Tarifpreis. Genau das, was man sonst händisch in Stripe machen müsste — jetzt per Button.
 *
 * Body: { subscriptionId: string (lokale ID), aktionsPreis: number (€/Monat), aktionsMonate: number }
 * Fasst NUR das Abo an (Coupon) — kein neuer Checkout, keine Kündigung.
 */
export async function POST(request: NextRequest) {
  try {
    const { subscriptionId, aktionsPreis, aktionsMonate } = await request.json()
    if (!subscriptionId || typeof aktionsPreis !== 'number' || typeof aktionsMonate !== 'number') {
      return NextResponse.json({ error: 'subscriptionId, aktionsPreis und aktionsMonate sind erforderlich' }, { status: 400 })
    }
    if (aktionsPreis <= 0 || aktionsMonate < 1) {
      return NextResponse.json({ error: 'Aktionspreis > 0 und Aktionsmonate ≥ 1 erforderlich' }, { status: 400 })
    }

    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('id, name, price, stripe_subscription_id')
      .eq('id', subscriptionId)
      .maybeSingle()
    if (!sub?.stripe_subscription_id) {
      return NextResponse.json({ error: 'Kein aktives Stripe-Abo verknüpft (Abo muss erst aktiv/bezahlt sein).' }, { status: 400 })
    }

    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
    if (stripeSub.status === 'canceled') {
      return NextResponse.json({ error: 'Stripe-Abo ist gekündigt.' }, { status: 400 })
    }
    const item = stripeSub.items.data[0]
    const baseCents = item?.price?.unit_amount ?? Math.round(Number(sub.price) * 100)
    const actionCents = Math.round(aktionsPreis * 100)
    const amountOff = baseCents - actionCents
    if (amountOff <= 0) {
      return NextResponse.json({ error: `Aktionspreis (${aktionsPreis}€) muss unter dem Tarifpreis (${(baseCents / 100).toFixed(2)}€) liegen.` }, { status: 400 })
    }

    // Repeating Coupon anlegen (Name max. 40 Zeichen).
    const coupon = await stripe.coupons.create({
      amount_off: amountOff,
      currency: 'eur',
      duration: 'repeating',
      duration_in_months: aktionsMonate,
      name: `Aktion: ${aktionsPreis}€ (${aktionsMonate} Mon.)`.slice(0, 40),
      metadata: { type: 'custom_action_applied', subscription_id: subscriptionId },
    })

    // Coupon auf das Abo anwenden — neuere API nutzt `discounts`, ältere `coupon`.
    try {
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        discounts: [{ coupon: coupon.id }],
      } as Parameters<typeof stripe.subscriptions.update>[1])
    } catch {
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        coupon: coupon.id,
      } as Parameters<typeof stripe.subscriptions.update>[1])
    }

    // Lokalen Anzeigepreis auf den Aktionspreis setzen.
    await supabaseAdmin.from('subscriptions').update({ price: aktionsPreis }).eq('id', subscriptionId)

    return NextResponse.json({ ok: true, aktionsPreis, aktionsMonate, amountOff: amountOff / 100 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unbekannter Fehler'
    console.error('Rabatt anwenden fehlgeschlagen:', error)
    return NextResponse.json({ error: `Rabatt anwenden fehlgeschlagen: ${msg}` }, { status: 500 })
  }
}
