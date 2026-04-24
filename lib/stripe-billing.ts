/**
 * Shared Billing-Logik für Subscription-Checkouts.
 *
 * Ab BILLING_START_DATE (Default 2026-05-01) wird die alte Trial-Logik
 * (trial_end = 1. des nächsten Monats) ersetzt durch Stripe-native Proration
 * via billing_cycle_anchor + proration_behavior: 'create_prorations'.
 *
 * Vorher: Signup am 20.04 → kostenlos bis 01.05, dann voller Monat
 * Nachher: Signup am 20.05 → anteilig zahlen (~11/31 × Monatspreis), dann 01.06 voller Monat
 *
 * Stripe berechnet die Proration exakt und tax-aware (unser 19% MwSt Tax Rate
 * wird automatisch auf die prorated line item angewendet).
 */

const DEFAULT_BILLING_START = '2026-05-01'

export function getBillingStartDate(): Date {
  const raw = process.env.BILLING_START_DATE || DEFAULT_BILLING_START
  return new Date(`${raw}T00:00:00Z`)
}

export function isBillingSwitchActive(now: Date = new Date()): boolean {
  return now.getTime() >= getBillingStartDate().getTime()
}

/**
 * Berechnet Unix-Timestamp für den 1. des nächsten Monats (00:00 UTC).
 */
function firstOfNextMonthUnix(now: Date = new Date()): number {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  return Math.floor(Date.UTC(y, m + 1, 1) / 1000)
}

export interface SubscriptionBillingParams {
  trial_end?: number
  billing_cycle_anchor?: number
  proration_behavior?: 'create_prorations'
}

/**
 * Liefert die passenden Billing-Parameter für `subscription_data` im Checkout.
 *
 * - Heute ist der 1. → {} (voller Monat sofort, kein Anchor nötig)
 * - Vor BILLING_START_DATE → { trial_end: 1. nächsten Monats } (alte Logik)
 * - Ab BILLING_START_DATE → { billing_cycle_anchor, proration_behavior }
 */
export function buildSubscriptionBillingParams(now: Date = new Date()): SubscriptionBillingParams {
  // Signup am 1. → voller Monat, keine Sonderbehandlung
  if (now.getUTCDate() === 1) {
    return {}
  }

  const firstOfNext = firstOfNextMonthUnix(now)

  if (isBillingSwitchActive(now)) {
    // Neue Proration-Logik: Stripe berechnet automatisch (Resttage/Monatstage × Preis)
    return {
      billing_cycle_anchor: firstOfNext,
      proration_behavior: 'create_prorations',
    }
  }

  // Alte Trial-Logik: kostenlos bis 1. des nächsten Monats
  return {
    trial_end: firstOfNext,
  }
}
