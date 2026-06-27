/**
 * READ-ONLY — Warum sind die SEPA-Lastschriften fehlgeschlagen?
 * Holt für jede gekündigte (payment_failed) Subscription den konkreten Fehlercode
 * der letzten Rechnung/Zahlung. Ändert NICHTS.
 *
 *   node --env-file=.env scripts/diagnose-payment-failures.mjs
 */
import Stripe from 'stripe'

const key = process.env.STRIPE_SECRET_KEY
if (!key) { console.error('✗ STRIPE_SECRET_KEY fehlt.'); process.exit(1) }
const stripe = new Stripe(key)
console.log(`\n── SEPA-Fehlergründe · ${key.startsWith('sk_live') ? 'LIVE' : 'TEST'} · read-only ──\n`)

const emailCache = new Map()
async function emailOf(c) {
  const id = typeof c === 'string' ? c : c?.id
  if (!id) return '—'
  if (emailCache.has(id)) return emailCache.get(id)
  try { const cu = await stripe.customers.retrieve(id); const e = cu?.deleted ? '(deleted)' : cu.email || '—'; emailCache.set(id, e); return e }
  catch { return '—' }
}

const codeCounts = {}

for await (const sub of stripe.subscriptions.list({ status: 'all', limit: 100 })) {
  if (sub.status !== 'canceled' || sub.cancellation_details?.reason !== 'payment_failed') continue
  const email = await emailOf(sub.customer)

  let code = '—', msg = '—'
  try {
    // letzte Rechnung der Sub holen, PaymentIntent expandieren
    const invs = await stripe.invoices.list({ subscription: sub.id, limit: 5 })
    for (const inv of invs.data) {
      const piId = typeof inv.payment_intent === 'string' ? inv.payment_intent : inv.payment_intent?.id
      if (!piId) continue
      const pi = await stripe.paymentIntents.retrieve(piId)
      if (pi.last_payment_error) {
        code = pi.last_payment_error.code || pi.last_payment_error.decline_code || '—'
        msg = pi.last_payment_error.message || '—'
        break
      }
      // SEPA-Fehler stehen oft am Charge
      const chId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id
      if (chId) {
        const ch = await stripe.charges.retrieve(chId)
        if (ch.failure_code) { code = ch.failure_code; msg = ch.failure_message || '—'; break }
      }
    }
  } catch (e) { msg = `lookup-fehler: ${e?.message || e}` }

  codeCounts[code] = (codeCounts[code] || 0) + 1
  console.log(`   ${email}  (${sub.metadata?.membership_id || '—'})`)
  console.log(`      Fehlercode: ${code}`)
  console.log(`      ${msg}`)
  console.log('')
}

console.log('▶ Fehlercodes gesamt:', codeCounts)
console.log('\nTypische SEPA-Codes:')
console.log('  insufficient_funds      = Konto nicht gedeckt')
console.log('  debit_not_authorized    = Kunde/Bank hat Lastschrift widersprochen / Mandat ungültig')
console.log('  account_closed / invalid_account = Konto/IBAN falsch oder geschlossen')
console.log('  no_account / bank_account_unusable = IBAN existiert nicht / nicht nutzbar\n')
