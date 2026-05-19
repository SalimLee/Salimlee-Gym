import { NextRequest, NextResponse } from 'next/server'
import { stripe, getOrCreateStripePrice, getOrCreateStripeCustomer, getOrCreateTaxRate, getOrCreateActionCoupon, MEMBERSHIP_STRIPE_MAP } from '@/lib/stripe'
import { computeProratedFirstMonth, upsertFirstMonthInvoiceItem } from '@/lib/stripe-billing'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe ist nicht konfiguriert (STRIPE_SECRET_KEY fehlt)' },
        { status: 500 }
      )
    }

    const { subscriptionId, memberEmail, memberName, membershipId, customAction } = await request.json()

    if (!subscriptionId || !memberEmail || !memberName || !membershipId) {
      return NextResponse.json(
        { error: 'subscriptionId, memberEmail, memberName und membershipId sind erforderlich' },
        { status: 400 }
      )
    }

    // Für individuelle Aktionen läuft die Subscription technisch auf dem gewählten Basis-Tarif.
    // Der Aktionsrabatt wird als repeating Coupon angehängt (siehe unten) und nach
    // `aktionsMonate` Monaten automatisch von Stripe beendet — Subscription läuft
    // dann regulär zum Basis-Preis weiter.
    const isCustomAction = membershipId === 'individuell'
    if (isCustomAction) {
      if (
        !customAction ||
        typeof customAction.basisId !== 'string' ||
        typeof customAction.aktionsPreis !== 'number' ||
        typeof customAction.aktionsMonate !== 'number' ||
        typeof customAction.bezeichnung !== 'string'
      ) {
        return NextResponse.json(
          { error: 'customAction mit basisId, aktionsPreis, aktionsMonate und bezeichnung ist für individuelle Aktionen erforderlich' },
          { status: 400 }
        )
      }
    }

    const effectiveMembershipId: string = isCustomAction ? customAction.basisId : membershipId

    const config = MEMBERSHIP_STRIPE_MAP[effectiveMembershipId]
    if (!config) {
      return NextResponse.json(
        { error: `Unbekannte Mitgliedschaft: ${effectiveMembershipId}` },
        { status: 400 }
      )
    }

    // Get or create Stripe price, customer, tax rate — und bei Aktionen zusätzlich den Coupon
    const [priceId, customerId, taxRateId, actionCouponId] = await Promise.all([
      getOrCreateStripePrice(effectiveMembershipId),
      getOrCreateStripeCustomer(memberEmail, memberName),
      getOrCreateTaxRate(),
      isCustomAction
        ? getOrCreateActionCoupon(customAction.basisId, customAction.aktionsPreis, customAction.aktionsMonate)
        : Promise.resolve(null as string | null),
    ])

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    // Build checkout session params
    const baseMetadata: Record<string, string> = {
      subscription_id: subscriptionId,
      // Webhook/Resync nutzen membership_id als Ankerpunkt — bei Aktionen zeigt er auf den Basis-Tarif,
      // damit bestehende Logik (Preis, Laufzeit, Servicepauschale) ohne Sonderfälle greift.
      membership_id: effectiveMembershipId,
      ...(isCustomAction
        ? {
            is_custom_action: 'true',
            custom_action_bezeichnung: String(customAction.bezeichnung).slice(0, 250),
            custom_action_preis_euro: String(customAction.aktionsPreis),
            custom_action_monate: String(customAction.aktionsMonate),
            custom_action_basis_id: String(customAction.basisId),
          }
        : {}),
    }

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      customer: customerId,
      locale: 'de',
      success_url: `${baseUrl}/zahlung-erfolgreich?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/zahlung-abgebrochen`,
      metadata: baseMetadata,
      custom_text: {
        submit: {
          message: config.recurring
            ? 'Hinweis: Zusätzlich wird eine Servicepauschale von 30 € alle 6 Monate automatisch eingezogen.'
            : 'Einmalzahlung — keine weiteren Kosten.',
        },
      },
    }

    if (config.recurring) {
      // Subscription mode for recurring memberships
      sessionParams.mode = 'subscription'
      sessionParams.line_items = [{ price: priceId, quantity: 1, tax_rates: [taxRateId] }]

      // ─────────────────────────────────────────────────────────────────────
      // Faire Proration: Referenz ist Vertragsabschluss (sub.start_date), NICHT
      // das Klickdatum. Wer am 14.5 angemeldet wird aber erst am 21.5 zahlt,
      // soll trotzdem 18/31 zahlen (vom 14.5 bis 1.6) statt nur 11/31.
      //
      // Mechanik:
      //   1. proratedCents wird manuell berechnet
      //   2. Pending Invoice Item (mit MwSt) für den Customer anlegen — wird von
      //      Stripe automatisch an die initial Subscription-Invoice gehängt
      //   3. subscription_data setzt billing_cycle_anchor + proration_behavior:'none',
      //      damit Stripe nicht ein zweites Mal eigene Proration drauflegt
      // ─────────────────────────────────────────────────────────────────────
      const { data: dbSub } = await supabaseAdmin
        .from('subscriptions')
        .select('start_date, created_at, price')
        .eq('id', subscriptionId)
        .maybeSingle()

      const signupDate = dbSub?.start_date
        ? new Date(`${dbSub.start_date}T00:00:00Z`)
        : (dbSub?.created_at ? new Date(dbSub.created_at) : new Date())

      // Für individuelle Aktionen ist `config.unitAmount` der Basis-Preis und der Aktionsrabatt
      // läuft als Stripe-Coupon. Damit die Proration auf den ECHTEN Aktionsbetrag rechnet,
      // nutzen wir bei Aktionen die per UI eingegebene `aktionsPreis` (in Euro).
      const effectiveMonthlyCents = isCustomAction
        ? Math.round(customAction.aktionsPreis * 100)
        : config.unitAmount

      const plan = computeProratedFirstMonth(signupDate, effectiveMonthlyCents)

      sessionParams.subscription_data = {
        ...plan.billing,
        default_tax_rates: [taxRateId],
        metadata: {
          ...baseMetadata,
          signup_date: dbSub?.start_date || new Date().toISOString().split('T')[0],
          first_month_prorated_cents: String(plan.proratedCents),
          ...(config.intervalCount ? { cancel_after_months: String(config.intervalCount) } : {}),
        },
      }

      // Pending Invoice Item für den anteiligen Erstmonat-Betrag. Idempotent —
      // alte pending Items derselben Subscription werden vorher entfernt, damit
      // mehrfaches Generieren des Checkout-Links keine Duplikate erzeugt.
      await upsertFirstMonthInvoiceItem({
        stripe,
        customerId,
        subscriptionId,
        membershipId: effectiveMembershipId,
        taxRateId,
        plan,
        extraMetadata: isCustomAction
          ? { is_custom_action: 'true', custom_action_basis_id: String(customAction.basisId) }
          : undefined,
      })

      // Aktionsrabatt als repeating Coupon anhängen — gilt automatisch nur für die ersten
      // `aktionsMonate` Abrechnungen und wird von Stripe danach selbst entfernt.
      // (Greift NICHT auf das pending Invoice Item, das ist bewusst — der Aktionsrabatt
      // wirkt erst ab dem ersten regulären Abrechnungszyklus.)
      if (actionCouponId) {
        sessionParams.discounts = [{ coupon: actionCouponId }]
      }
    } else {
      // Payment mode for one-time purchases (10er Karte)
      sessionParams.mode = 'payment'
      sessionParams.line_items = [{ price: priceId, quantity: 1, tax_rates: [taxRateId] }]
      // Stripe erstellt von sich aus keine Invoice bei Einmalzahlungen.
      // Mit invoice_creation.enabled = true bekommen wir automatisch ein Invoice-Dokument
      // inkl. PDF und zugehöriges invoice.paid / invoice.finalized Event.
      sessionParams.invoice_creation = {
        enabled: true,
        invoice_data: {
          description: '10er Karte – 6 Monate gültig',
          metadata: baseMetadata,
        },
      }
      sessionParams.payment_intent_data = {
        metadata: baseMetadata,
      }
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
