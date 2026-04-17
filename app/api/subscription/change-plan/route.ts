import { NextRequest, NextResponse } from 'next/server'
import { stripe, getOrCreateStripePrice, getOrCreateTaxRate, MEMBERSHIP_STRIPE_MAP } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Wechselt den Tarif eines bestehenden Abos.
 *
 * Zwei Fälle:
 * A) Abo hat Stripe-Subscription (active/paused/active-with-trial):
 *    - Stripe Subscription updaten (neuer Price, Tax Rate, Metadaten, cancel_at)
 *    - Trial bleibt erhalten, proration_behavior: 'none'
 *
 * B) Abo ist pending, nur Checkout-Session existiert (Kunde hat Link noch nicht geklickt):
 *    - Alte Checkout-Session läuft aus
 *    - Supabase (name, price, end_date) wird upgedatet
 *    - Admin klickt danach "Erinnerung" → neuer Link mit neuem Tarif geht raus
 */
export async function POST(request: NextRequest) {
  try {
    const { subscriptionId, newMembershipId } = await request.json()

    if (!subscriptionId || !newMembershipId) {
      return NextResponse.json(
        { error: 'subscriptionId und newMembershipId sind erforderlich' },
        { status: 400 }
      )
    }

    const newConfig = MEMBERSHIP_STRIPE_MAP[newMembershipId]
    if (!newConfig) {
      return NextResponse.json(
        { error: `Unbekannte Mitgliedschaft: ${newMembershipId}` },
        { status: 400 }
      )
    }

    if (!newConfig.recurring) {
      return NextResponse.json(
        { error: 'Wechsel zu Einmalzahlungen (10er-Karte) ist nicht möglich. Bitte Abo kündigen und neuen Vertrag erstellen.' },
        { status: 400 }
      )
    }

    const { data: sub, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single()

    if (subError || !sub) {
      return NextResponse.json({ error: 'Abo nicht gefunden' }, { status: 404 })
    }

    // Laufzeit neu berechnen
    const newPrice = newConfig.unitAmount / 100
    let newEndDateIso: string | null = null

    // ─── Fall A: Stripe-Subscription existiert ───────────────────────────
    if (sub.stripe_subscription_id) {
      let stripeSub
      try {
        stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
      } catch {
        return NextResponse.json({ error: 'Stripe-Subscription nicht gefunden' }, { status: 404 })
      }

      if (stripeSub.status === 'canceled') {
        return NextResponse.json({ error: 'Stripe-Subscription ist bereits gekündigt' }, { status: 400 })
      }

      const currentItem = stripeSub.items.data[0]
      if (!currentItem) {
        return NextResponse.json({ error: 'Stripe-Subscription hat keine Line Items' }, { status: 500 })
      }

      const [newPriceId, taxRateId] = await Promise.all([
        getOrCreateStripePrice(newMembershipId),
        getOrCreateTaxRate(),
      ])

      // Neues cancel_at vom Original-Start-Datum aus berechnen
      const startTs = stripeSub.start_date || stripeSub.created
      const startDate = new Date(startTs * 1000)
      let newCancelAt: number | null = null

      if (newConfig.intervalCount) {
        const endDate = new Date(startDate)
        endDate.setMonth(endDate.getMonth() + newConfig.intervalCount)
        newCancelAt = Math.floor(endDate.getTime() / 1000)
        newEndDateIso = endDate.toISOString().slice(0, 10)
      }

      const updateParams: Parameters<typeof stripe.subscriptions.update>[1] = {
        items: [{ id: currentItem.id, price: newPriceId, tax_rates: [taxRateId] }],
        default_tax_rates: [taxRateId],
        proration_behavior: 'none',
        metadata: {
          ...stripeSub.metadata,
          subscription_id: subscriptionId,
          membership_id: newMembershipId,
          ...(newConfig.intervalCount
            ? { cancel_after_months: String(newConfig.intervalCount) }
            : { cancel_after_months: '' }),
        },
      }

      if (newCancelAt) {
        updateParams.cancel_at = newCancelAt
      } else {
        updateParams.cancel_at = null
      }

      await stripe.subscriptions.update(sub.stripe_subscription_id, updateParams)
    }
    // ─── Fall B: Nur Checkout-Session, noch nicht durchgeklickt ─────────
    else if (sub.stripe_checkout_session_id) {
      // Alte Session laufen lassen (sofern noch offen)
      try {
        const oldSession = await stripe.checkout.sessions.retrieve(sub.stripe_checkout_session_id)
        if (oldSession.status === 'open') {
          await stripe.checkout.sessions.expire(sub.stripe_checkout_session_id)
        }
      } catch {
        // Session bereits abgelaufen/weg — ignorieren
      }

      // end_date für Fix-Laufzeit ab Start-Date
      if (newConfig.intervalCount && sub.start_date) {
        const startDate = new Date(sub.start_date)
        const endDate = new Date(startDate)
        endDate.setMonth(endDate.getMonth() + newConfig.intervalCount)
        newEndDateIso = endDate.toISOString().slice(0, 10)
      }
      // Neue Checkout-Session wird erst beim nächsten "Erinnerung"-Klick
      // via send-reminder erzeugt (nutzt dann den aktualisierten sub.name)
    } else {
      return NextResponse.json(
        { error: 'Abo hat weder Stripe-Subscription noch Checkout-Session. Bitte Abo löschen und neu anlegen.' },
        { status: 400 }
      )
    }

    // Supabase updaten (beide Fälle)
    const updatePayload: Record<string, unknown> = {
      name: newConfig.name,
      price: newPrice,
    }
    if (newEndDateIso !== null || newConfig.intervalCount) {
      updatePayload.end_date = newEndDateIso
    }

    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update(updatePayload)
      .eq('id', subscriptionId)

    if (updateError) {
      console.error('Supabase-Update nach Tarifwechsel fehlgeschlagen:', updateError)
      return NextResponse.json(
        { error: 'Stripe wurde aktualisiert, aber Supabase-Update fehlgeschlagen. Bitte manuell prüfen.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      newName: newConfig.name,
      newPrice,
      newEndDate: newEndDateIso,
      pendingCheckout: !sub.stripe_subscription_id,
    })
  } catch (error) {
    console.error('Tarifwechsel fehlgeschlagen:', error)
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler'
    return NextResponse.json(
      { error: `Tarifwechsel fehlgeschlagen: ${message}` },
      { status: 500 }
    )
  }
}
