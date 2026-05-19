import { NextRequest, NextResponse } from 'next/server'
import { stripe, getOrCreateStripePrice, getOrCreateStripeCustomer, getOrCreateTaxRate, getOrCreateActionCoupon, MEMBERSHIP_STRIPE_MAP } from '@/lib/stripe'
import { computeProratedFirstMonth } from '@/lib/stripe-billing'
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
        .select('start_date, created_at, price, payment_status, member_id')
        .eq('id', subscriptionId)
        .maybeSingle()

      const signupDate = dbSub?.start_date
        ? new Date(`${dbSub.start_date}T00:00:00Z`)
        : (dbSub?.created_at ? new Date(dbSub.created_at) : new Date())

      // ─────────────────────────────────────────────────────────────────────
      // REAKTIVIERUNG: Coach hat ein beendetes Abo wiederbelebt. Bei erneutem
      // Checkout darf KEINE anteilige Erstmonats-Rechnung anfallen — Kunde hat
      // schon einmal gezahlt, der Zyklus war nur unterbrochen.
      //
      // Marker: subscriptions.payment_status === 'reactivation_pending' (gesetzt
      // von der `reactivate()`-Aktion im SubscriptionsTab).
      //
      // SICHERUNG: Reaktivierungs-Flow nur greifen lassen, wenn der Member
      // tatsächlich schon mal eine Stripe-Rechnung bezahlt hat. Sonst — z.B.
      // wenn der Coach versehentlich bei einer noch nie bezahlten Sub auf
      // "Reaktivieren" klickt — fallen wir auf die normale anteilige Berechnung
      // zurück (sonst würde der Kunde gratis den ersten Teilmonat trainieren).
      // ─────────────────────────────────────────────────────────────────────
      let isReactivation = dbSub?.payment_status === 'reactivation_pending'
      if (isReactivation && dbSub?.member_id) {
        // Wir prüfen nicht nur "gibt's überhaupt paid Invoices", sondern auch ob
        // ein ECHTER Betrag > 0 € geflossen ist. Eine 0 €-Initial-Invoice (z.B. aus
        // einem fehlerhaft konfigurierten Checkout) zählt NICHT als "schon mal
        // gezahlt" — sonst würde der nächste Reminder fälschlich wieder 0 € initial
        // zeigen und die anteilige Berechnung übersprungen.
        const { data: realPaidInvs } = await supabaseAdmin
          .from('invoices')
          .select('id')
          .eq('member_id', dbSub.member_id)
          .eq('status', 'paid')
          .gt('amount', 0)
          .limit(1)
        if (!realPaidInvs || realPaidInvs.length === 0) {
          console.warn(`Sub ${subscriptionId}: reactivation_pending gesetzt, aber Member ${dbSub.member_id} hat keine paid Invoice mit Betrag > 0 — fallback auf anteilige Erstanmeldung`)
          isReactivation = false
        }
      }

      // Für individuelle Aktionen ist `config.unitAmount` der Basis-Preis und der Aktionsrabatt
      // läuft als Stripe-Coupon. Damit die Proration auf den ECHTEN Aktionsbetrag rechnet,
      // nutzen wir bei Aktionen die per UI eingegebene `aktionsPreis` (in Euro).
      const effectiveMonthlyCents = isCustomAction
        ? Math.round(customAction.aktionsPreis * 100)
        : config.unitAmount

      if (isReactivation) {
        // Anchor = 1. nächsten Monats relativ zu HEUTE. proration_behavior 'none' +
        // KEIN pending Invoice Item → Stripe nimmt die Karte entgegen, initial Invoice
        // ist 0 € (bzw. "no_payment_required"), erste echte Abbuchung am Anchor.
        const now = new Date()
        const anchorDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
        const anchorUnix = Math.floor(anchorDate.getTime() / 1000)

        sessionParams.subscription_data = {
          billing_cycle_anchor: anchorUnix,
          proration_behavior: 'none',
          default_tax_rates: [taxRateId],
          metadata: {
            ...baseMetadata,
            is_reactivation: 'true',
            reactivated_at: now.toISOString().split('T')[0],
            anchor_date: anchorDate.toISOString().split('T')[0],
            ...(config.intervalCount ? { cancel_after_months: String(config.intervalCount) } : {}),
          },
        }
        // Bewusst KEIN upsertFirstMonthInvoiceItem — keine anteilige Berechnung bei Reaktivierung.
      } else {
        // Normale Erst-Anmeldung — Stripe rechnet die anteilige Erstmonats-Charge
        // automatisch via `billing_cycle_anchor: 01.<next> + proration_behavior:
        // 'create_prorations'`. Stripe Checkout UI zeigt "Heute fällig: X €" direkt.
        const plan = computeProratedFirstMonth(signupDate, effectiveMonthlyCents)

        // CLEANUP: alte pending first_month_prorated Items aus früheren Test-
        // Versuchen entfernen, sonst landen sie zusätzlich zur Auto-Proration
        // auf der Initial-Invoice und der Kunde zahlt doppelt anteilig.
        try {
          const existing = await stripe.invoiceItems.list({ customer: customerId, limit: 100, pending: true })
          for (const item of existing.data) {
            if (item.metadata?.type === 'first_month_prorated') {
              await stripe.invoiceItems.del(item.id)
              console.log(`[create-checkout] Pending first_month_prorated Item ${item.id} gelöscht (Customer ${customerId})`)
            }
          }
        } catch (e) {
          console.warn('Konnte alte first_month_prorated Items nicht aufräumen:', e)
        }

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
      }

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
    // Stripe-Fehler 1:1 weiterleiten — sonst weiß der Coach im Frontend nicht
    // warum kein Checkout-Link entstanden ist. Stripe-Errors haben oft
    // sprechende Messages ("trial_end is in the past", "tax_behavior conflicts ...").
    const msg = error instanceof Error ? error.message : 'Unbekannter Fehler'
    console.error('Stripe Checkout Session Erstellung fehlgeschlagen:', error)
    return NextResponse.json(
      { error: `Checkout Session: ${msg}` },
      { status: 500 }
    )
  }
}
