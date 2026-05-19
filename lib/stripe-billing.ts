/**
 * Shared Billing-Logik für Subscription-Checkouts.
 *
 * Faire Erste-Monat-Proration:
 *   - Referenz ist das *Vertragsabschluss-Datum* (sub.start_date), NICHT der Tag an
 *     dem der Kunde den Checkout-Link tatsächlich anklickt. Sonst zahlt jemand der
 *     am 14.5 angemeldet wurde aber erst am 21.5 zahlt nur 11/31 statt 18/31.
 *   - Wir packen den anteiligen Betrag als pending Invoice Item für den Stripe-Customer
 *     an (manuelle Proration), setzen `proration_behavior: 'none'` und den
 *     `billing_cycle_anchor` auf den 1. des nächsten Monats nach Vertragsabschluss.
 *   - Liegt das Vertragsdatum in der Zukunft → wir nehmen `today` als Basis, sonst
 *     würde der Kunde für einen Zeitraum zahlen, der noch nicht angefangen hat.
 *
 * Stripe übernimmt den 19% MwSt Tax Rate automatisch auf das pending Invoice Item.
 */

export interface SubscriptionBillingParams {
  billing_cycle_anchor?: number
  proration_behavior?: 'none' | 'create_prorations'
}

export interface ProratedFirstMonthPlan {
  /** Stripe `subscription_data` Parameter — billing_cycle_anchor + proration_behavior */
  billing: SubscriptionBillingParams
  /** Anteiliger Betrag in Cent für den ersten Monat. 0 = keine separate Anteilszahlung nötig. */
  proratedCents: number
  /** Tatsächliches Referenzdatum, das für die Berechnung verwendet wurde (UTC). */
  referenceDate: Date
  /** Datum des ersten regulären Abrechnungszyklus (UTC, 00:00). */
  anchorDate: Date
  /** Anzahl Tage zwischen referenceDate und anchorDate. */
  daysRemaining: number
  /** Tage im Referenz-Monat (für Anzeige/Begründung). */
  daysInMonth: number
}

/**
 * Berechnet Unix-Timestamp für den 1. des nächsten Monats (00:00 UTC) relativ zu `date`.
 */
function firstOfNextMonthUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))
}

/**
 * Tage im Monat von `date` (1–31).
 */
function daysInMonthOf(date: Date): number {
  // Letzter Tag des Monats = Tag 0 des Folgemonats
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
}

/**
 * Berechnet die manuelle Anteilszahlung für den ersten Monat einer neuen Subscription.
 *
 * @param signupDate Vertragsabschluss-Datum aus subscriptions.start_date (DATE, UTC).
 * @param monthlyCents Voller Monatsbetrag in Cent (z.B. 8000 für 80€).
 * @param now Aktuelle Zeit (für Tests injizierbar).
 */
export function computeProratedFirstMonth(
  signupDate: Date,
  monthlyCents: number,
  now: Date = new Date()
): ProratedFirstMonthPlan {
  // Wenn signupDate in der Zukunft → today als Basis (Stripe kann nicht "rückwärts" chargen).
  const referenceDate = signupDate.getTime() < now.getTime() ? signupDate : now

  // Anchor = 1. des nächsten Monats nach referenceDate.
  const anchorDate = firstOfNextMonthUTC(referenceDate)
  const anchorUnix = Math.floor(anchorDate.getTime() / 1000)

  const msPerDay = 24 * 60 * 60 * 1000
  const daysInMonth = daysInMonthOf(referenceDate)
  const daysRemaining = Math.max(
    0,
    Math.round((anchorDate.getTime() - referenceDate.getTime()) / msPerDay)
  )

  const proratedCents = Math.round((monthlyCents * daysRemaining) / daysInMonth)

  return {
    billing: {
      billing_cycle_anchor: anchorUnix,
      proration_behavior: 'none',
    },
    proratedCents,
    referenceDate,
    anchorDate,
    daysRemaining,
    daysInMonth,
  }
}

/**
 * Legt das pending Invoice Item für den fairen ersten Monat an und entfernt
 * alte pending Items derselben Subscription, damit mehrfaches Aufrufen
 * (z.B. erneuter Checkout-Link via Reminder) keine Duplikate erzeugt.
 *
 * Wird sowohl von create-checkout als auch von send-reminder genutzt.
 */
export async function upsertFirstMonthInvoiceItem(opts: {
  stripe: import('stripe').default
  customerId: string
  subscriptionId: string
  membershipId: string
  taxRateId: string
  plan: ProratedFirstMonthPlan
  extraMetadata?: Record<string, string>
}): Promise<void> {
  const { stripe, customerId, subscriptionId, membershipId, taxRateId, plan, extraMetadata } = opts

  if (plan.proratedCents <= 0) return

  // Dedup: alte pending first_month_prorated Items derselben Subscription löschen
  try {
    const existing = await stripe.invoiceItems.list({ customer: customerId, limit: 100, pending: true })
    for (const item of existing.data) {
      if (
        item.metadata?.type === 'first_month_prorated' &&
        item.metadata?.subscription_id === subscriptionId
      ) {
        await stripe.invoiceItems.del(item.id)
      }
    }
  } catch (e) {
    console.warn('Konnte alte first_month_prorated Items nicht aufräumen:', e)
  }

  const isFullMonth = plan.daysRemaining >= plan.daysInMonth
  const dayBefore = new Date(plan.anchorDate.getTime() - 24 * 60 * 60 * 1000)
  const description = isFullMonth
    ? `Erster Monat ${formatDateDE(plan.referenceDate)} – ${formatDateDE(dayBefore)}`
    : `Anteilig erster Monat (${formatDateDE(plan.referenceDate)} – ${formatDateDE(dayBefore)}, ${plan.daysRemaining}/${plan.daysInMonth} Tage)`

  await stripe.invoiceItems.create({
    customer: customerId,
    currency: 'eur',
    amount: plan.proratedCents,
    description,
    tax_rates: [taxRateId],
    metadata: {
      ...(extraMetadata || {}),
      subscription_id: subscriptionId,
      membership_id: membershipId,
      type: 'first_month_prorated',
      signup_date: formatDateDE(plan.referenceDate),
      anchor_date: formatDateDE(plan.anchorDate),
      days_remaining: String(plan.daysRemaining),
      days_in_month: String(plan.daysInMonth),
    },
  })
}

/**
 * Formatiert ein Datum als "TT.MM.YYYY".
 */
export function formatDateDE(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${day}.${month}.${date.getUTCFullYear()}`
}

// ---------------------------------------------------------------------------
// Legacy: vorherige Implementation auf Basis des Checkout-Klick-Datums.
// Wird noch von einigen Stellen importiert; intern delegiert sie an die neue
// Logik mit signupDate = now als Fallback.
// ---------------------------------------------------------------------------

/**
 * @deprecated Nutze `computeProratedFirstMonth(signupDate, monthlyCents)` mit dem
 *             tatsächlichen Vertragsabschluss-Datum aus subscriptions.start_date.
 *             Diese Variante nutzt das Klickdatum und ist nicht fair für Kunden,
 *             die zwischen Anmeldung und Checkout warten.
 */
export function buildSubscriptionBillingParams(now: Date = new Date()): SubscriptionBillingParams {
  if (now.getUTCDate() === 1) return {}
  const anchor = firstOfNextMonthUTC(now)
  return {
    billing_cycle_anchor: Math.floor(anchor.getTime() / 1000),
    proration_behavior: 'create_prorations',
  }
}
