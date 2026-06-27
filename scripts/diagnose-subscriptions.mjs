/**
 * READ-ONLY Diagnose — Warum sind Subscriptions gekündigt?
 * Ändert NICHTS. Liest nur Stripe (LIVE) aus und zeigt für jede Subscription den
 * echten Status + Kündigungsgrund (cancellation_details.reason).
 *
 * NUTZUNG (Node 20+):
 *   node --env-file=.env scripts/diagnose-subscriptions.mjs
 */

import Stripe from 'stripe'

const key = process.env.STRIPE_SECRET_KEY
if (!key) {
  console.error('✗ STRIPE_SECRET_KEY fehlt. Mit  node --env-file=.env  starten.')
  process.exit(1)
}
const stripe = new Stripe(key)
const live = key.startsWith('sk_live') || key.startsWith('rk_live')
console.log(`\n── Subscription-Diagnose · ${live ? 'LIVE' : 'TEST/SANDBOX'} Stripe · read-only ──\n`)

const emailCache = new Map()
async function emailOf(customer) {
  const id = typeof customer === 'string' ? customer : customer?.id
  if (!id) return '—'
  if (emailCache.has(id)) return emailCache.get(id)
  try {
    const c = await stripe.customers.retrieve(id)
    const email = c && !c.deleted ? c.email || '—' : '(deleted)'
    emailCache.set(id, email)
    return email
  } catch {
    return '—'
  }
}

const d = (ts) => (ts ? new Date(ts * 1000).toISOString().slice(0, 10) : '—')

const byStatus = {}
const canceledRows = []
const activeWithCancelAt = []
let total = 0

for await (const sub of stripe.subscriptions.list({ status: 'all', limit: 100 })) {
  total++
  byStatus[sub.status] = (byStatus[sub.status] || 0) + 1
  const email = await emailOf(sub.customer)

  if (sub.status === 'canceled') {
    canceledRows.push({
      email,
      created: d(sub.start_date || sub.created),
      ended: d(sub.ended_at),
      reason: sub.cancellation_details?.reason || '—',
      cancel_at: d(sub.cancel_at),
      term: sub.metadata?.cancel_after_months || '—',
      membership: sub.metadata?.membership_id || '—',
      id: sub.id,
    })
  } else if (sub.cancel_at) {
    activeWithCancelAt.push({
      email, status: sub.status, created: d(sub.start_date || sub.created),
      cancel_at: d(sub.cancel_at), term: sub.metadata?.cancel_after_months || '—', id: sub.id,
    })
  }
}

console.log(`Gesamt: ${total} Subscriptions`)
console.log('Nach Status:', byStatus, '\n')

console.log(`▶ GEKÜNDIGTE Subscriptions (${canceledRows.length}) — mit Grund:`)
console.log('   (reason: payment_failed = SEPA/Zahlung fehlgeschlagen · cancellation_requested = manuell gekündigt)\n')
for (const r of canceledRows.sort((a, b) => (a.ended < b.ended ? 1 : -1))) {
  console.log(`   ${r.email}`)
  console.log(`      Tarif ${r.membership} (Laufzeit-Meta: ${r.term} Mon.) · erstellt ${r.created} · beendet ${r.ended}`)
  console.log(`      GRUND: ${r.reason}${r.cancel_at !== '—' ? ` · hatte cancel_at ${r.cancel_at}` : ''}`)
  console.log('')
}

console.log(`▶ AKTIVE Subscriptions mit geplanter Kündigung (cancel_at gesetzt) (${activeWithCancelAt.length}):`)
for (const r of activeWithCancelAt.sort((a, b) => (a.cancel_at < b.cancel_at ? -1 : 1))) {
  console.log(`   ${r.email} · ${r.status} · erstellt ${r.created} · cancel_at ${r.cancel_at} (Laufzeit ${r.term} Mon.)`)
}

// Zusammenfassung der Kündigungsgründe
const reasonCounts = {}
for (const r of canceledRows) reasonCounts[r.reason] = (reasonCounts[r.reason] || 0) + 1
console.log('\n▶ Kündigungsgründe gesamt:', reasonCounts)
console.log('')
