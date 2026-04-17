import { NextRequest, NextResponse } from 'next/server'
import { stripe, getOrCreateStripePrice, getOrCreateTaxRate, MEMBERSHIP_STRIPE_MAP } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Wechselt den Tarif eines bestehenden Abos.
 * - Aktualisiert Stripe Subscription (Preis, Metadaten, cancel_at)
 * - Behält Trial-Ende bei (keine sofortige Abbuchung während Trial)
 * - Aktualisiert Supabase (name, price, end_date)
 *
 * Hinweis: Wechsel von/zu 10er-Karte ist nicht möglich (payment vs. subscription mode).
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

    // Supabase-Abo laden
    const { data: sub, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single()

    if (subError || !sub) {
      return NextResponse.json({ error: 'Abo nicht gefunden' }, { status: 404 })
    }

    if (!sub.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'Kein Stripe-Abo verknüpft. Tarifwechsel nur für Stripe-Abos möglich.' },
        { status: 400 }
      )
    }

    // Stripe-Subscription laden
    let stripeSub
    try {
      stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
    } catch {
      return NextResponse.json(
        { error: 'Stripe-Subscription nicht gefunden' },
        { status: 404 }
      )
    }

    if (stripeSub.status === 'canceled') {
      return NextResponse.json(
        { error: 'Stripe-Subscription ist bereits gekündigt' },
        { status: 400 }
      )
    }

    const currentItem = stripeSub.items.data[0]
    if (!currentItem) {
      return NextResponse.json(
        { error: 'Stripe-Subscription hat keine Line Items' },
        { status: 500 }
      )
    }

    // Neuen Stripe-Preis besorgen
    const [newPriceId, taxRateId] = await Promise.all([
      getOrCreateStripePrice(newMembershipId),
      getOrCreateTaxRate(),
    ])

    // Neues cancel_at berechnen (bei Fix-Laufzeit vom Start-Date an)
    // Für monatlich kündbar: cancel_at entfernen
    const startTs = stripeSub.start_date || stripeSub.created
    const startDate = new Date(startTs * 1000)
    let newCancelAt: number | null = null
    let newEndDateIso: string | null = null

    if (newConfig.intervalCount) {
      const endDate = new Date(startDate)
      endDate.setMonth(endDate.getMonth() + newConfig.intervalCount)
      newCancelAt = Math.floor(endDate.getTime() / 1000)
      newEndDateIso = endDate.toISOString().slice(0, 10)
    }

    // Stripe Subscription updaten:
    // - Neues Line Item (ersetzt altes)
    // - Tax Rate neu setzen
    // - Metadaten updaten (membership_id, cancel_after_months)
    // - proration_behavior: 'none' — während Trial keine Charges, nach Trial fair ab neuer Periode
    // - trial_end bleibt unverändert (Stripe fasst es nicht an, wenn nicht übergeben)
    const updateParams: Parameters<typeof stripe.subscriptions.update>[1] = {
      items: [
        {
          id: currentItem.id,
          price: newPriceId,
          tax_rates: [taxRateId],
        },
      ],
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
      // Monatlich kündbar → bestehendes cancel_at entfernen
      updateParams.cancel_at = null
    }

    await stripe.subscriptions.update(sub.stripe_subscription_id, updateParams)

    // Supabase updaten
    const newPrice = newConfig.unitAmount / 100
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        name: newConfig.name,
        price: newPrice,
        end_date: newEndDateIso,
      })
      .eq('id', subscriptionId)

    if (updateError) {
      console.error('Supabase-Update nach Stripe-Plan-Wechsel fehlgeschlagen:', updateError)
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
