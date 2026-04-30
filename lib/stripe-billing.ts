/**
 * Shared Billing-Logik für Subscription-Checkouts.
 *
 * Stripe-native Proration via billing_cycle_anchor + proration_behavior:
 *   - Signup am 1. eines Monats → voller Monat sofort, kein Anchor
 *   - Signup an jedem anderen Tag → Stripe rechnet (Resttage/Monatstage × Monatspreis)
 *     für den laufenden Monat anteilig, danach läuft der reguläre Zyklus zum 1.
 *
 * Stripe berechnet die Proration exakt und tax-aware (unser 19% MwSt Tax Rate
 * wird automatisch auf das prorated line item angewendet).
 *
 * Hinweis: Bewusst KEIN trial_end mehr — der hatte ein hartes Stripe-Minimum
 * von 48h Vorlauf und ließ sich am Monatsende (29./30./31.) nicht erfüllen.
 * billing_cycle_anchor hat dieses Limit nicht.
 */

export interface SubscriptionBillingParams {
  billing_cycle_anchor?: number
  proration_behavior?: 'create_prorations'
}

/**
 * Berechnet Unix-Timestamp für den 1. des nächsten Monats (00:00 UTC).
 */
function firstOfNextMonthUnix(now: Date = new Date()): number {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  return Math.floor(Date.UTC(y, m + 1, 1) / 1000)
}

/**
 * Liefert die passenden Billing-Parameter für `subscription_data` im Checkout.
 *
 *   - Heute ist der 1. → {} (voller Monat sofort, kein Anchor nötig)
 *   - Sonst → { billing_cycle_anchor, proration_behavior } (anteilig + Zyklus auf 1. des nächsten Monats)
 */
export function buildSubscriptionBillingParams(now: Date = new Date()): SubscriptionBillingParams {
  // Signup am 1. → voller Monat, keine Sonderbehandlung
  if (now.getUTCDate() === 1) {
    return {}
  }

  return {
    billing_cycle_anchor: firstOfNextMonthUnix(now),
    proration_behavior: 'create_prorations',
  }
}
