/**
 * AUTONOM: Schuldner & gekündigte Kunden abarbeiten.
 *   Teil A: offene fehlgeschlagene Rechnungen (≥1 Versuch) bei Kunden mit laufendem
 *           Abo  → direkter Stripe-Zahllink (hosted_invoice_url) per Resend.
 *   Teil B: Kunden OHNE laufendes Abo (gekündigt) → Reaktivierungslink über die
 *           deployte Route /api/subscription/send-reminder (setzt DB + Checkout + Mail).
 *   Übersprungen: Rechnungen mit 0 Zahlungsversuchen (SEPA in Bearbeitung → Stripe).
 *
 * Vorschau (verschickt NICHTS):  node --env-file=.env scripts/process-debtors.mjs
 * Wirklich senden:               node --env-file=.env scripts/process-debtors.mjs --send
 */
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const SEND = process.argv.includes('--send')
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)
const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM || 'Salim Lee Gym <noreply@salimlee-gym.de>'
const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://salimlee-gym.de'

const eur = (c) => `${(c / 100).toFixed(2)} €`
const LIVE = new Set(['active', 'trialing', 'past_due', 'unpaid'])

console.log(`\n── Schuldner-Verarbeitung · ${SEND ? 'SENDEN (live!)' : 'VORSCHAU (kein Versand)'} ──\n`)

// ── Kundeninfo + laufende Abos sammeln ──────────────────────────────────────
const custInfo = new Map()      // cid -> {email,name}
const liveCustomers = new Set() // cid mit laufendem Abo
async function info(cid) {
  if (custInfo.has(cid)) return custInfo.get(cid)
  let v = { email: null, name: null }
  try { const c = await stripe.customers.retrieve(cid); if (c && !c.deleted) v = { email: c.email, name: c.name } } catch {}
  custInfo.set(cid, v); return v
}
for await (const sub of stripe.subscriptions.list({ status: 'all', limit: 100 })) {
  const cid = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
  if (LIVE.has(sub.status)) liveCustomers.add(cid)
}

// ── Teil A: offene fehlgeschlagene Rechnungen (Kunde MIT laufendem Abo) ──────
const payByCustomer = new Map() // cid -> {email,name, items:[{amount,url,number}]}
for await (const inv of stripe.invoices.list({ status: 'open', limit: 100 })) {
  if ((inv.attempt_count || 0) < 1) continue            // 0 Versuche = SEPA in Bearbeitung → skip
  const cid = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id
  if (!liveCustomers.has(cid)) continue                 // ohne laufendes Abo → Teil B (Reaktivierung)
  const ci = await info(cid)
  const email = inv.customer_email || ci.email
  if (!email) continue
  if (!payByCustomer.has(cid)) payByCustomer.set(cid, { email, name: inv.customer_name || ci.name || 'Mitglied', items: [] })
  payByCustomer.get(cid).items.push({ amount: inv.amount_due - (inv.amount_paid || 0), url: inv.hosted_invoice_url, number: inv.number || inv.id })
}

// ── Teil B: gekündigte Kunden ohne laufendes Abo → Reaktivierung ────────────
// Lokale subscriptions laden, Mitglieder ohne aktives Abo herausfinden.
const { data: dbSubs, error: dbErr } = await supabase
  .from('subscriptions')
  .select('id, name, status, payment_status, member_id, stripe_customer_id, members:member_id(email,name)')
if (dbErr) console.warn('⚠️ Supabase-Lesen fehlgeschlagen:', dbErr.message)
// E-Mails der Kunden mit laufendem Stripe-Abo (Stripe = Wahrheit).
const liveEmails = new Set()
for (const cid of liveCustomers) { const ci = await info(cid); if (ci.email) liveEmails.add(ci.email.toLowerCase().trim()) }

// Reaktivieren: lokal reactivation_pending UND KEIN laufendes Stripe-Abo
// (sonst würde ein Kunde mit aktivem Abo ein Doppel-Abo bekommen).
const seenMember = new Set()
const reactivations = []
for (const s of (dbSubs || [])) {
  if (s.payment_status !== 'reactivation_pending') continue
  const m = Array.isArray(s.members) ? s.members[0] : s.members
  if (!m?.email) continue
  if (liveEmails.has(m.email.toLowerCase().trim())) continue   // hat schon aktives Abo → NICHT doppelt
  if (seenMember.has(s.member_id)) continue
  seenMember.add(s.member_id)
  reactivations.push({ subscriptionId: s.id, name: s.name, email: m.email, memberName: m.name })
}

// ── Ausgabe Plan ────────────────────────────────────────────────────────────
console.log(`▶ TEIL A — Zahllinks an Kunden mit laufendem Abo (${payByCustomer.size}):`)
for (const [, c] of payByCustomer) {
  const sum = c.items.reduce((s, i) => s + i.amount, 0)
  console.log(`   ${c.name} <${c.email}> — offen ${eur(sum)}  (${c.items.map(i => i.number).join(', ')})`)
}
console.log(`\n▶ TEIL B — Reaktivierungslinks an gekündigte Kunden (${reactivations.length}):`)
for (const r of reactivations) console.log(`   ${r.memberName} <${r.email}> — ${r.name}`)

if (!SEND) {
  console.log('\n(Vorschau — nichts gesendet. Mit --send wirklich verschicken.)\n')
  process.exit(0)
}

// ── SENDEN ──────────────────────────────────────────────────────────────────
let aOk = 0, aErr = 0, bOk = 0, bErr = 0

for (const [, c] of payByCustomer) {
  const sum = c.items.reduce((s, i) => s + i.amount, 0)
  const rows = c.items.map(i => `<tr><td style="padding:6px 0;color:#a1a1aa">Rechnung ${i.number}</td><td style="padding:6px 0;text-align:right;color:#fafafa;font-weight:bold">${eur(i.amount)}</td></tr>`).join('')
  const payUrl = c.items[0].url
  try {
    const { error } = await resend.emails.send({
      from: FROM, to: c.email,
      subject: 'Offene Zahlung – bitte begleichen | Salim Lee Gym',
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
      <body style="font-family:Arial,sans-serif;background:#09090b;margin:0;padding:20px">
      <div style="max-width:600px;margin:0 auto;background:#18181b;border-radius:16px;overflow:hidden;border:1px solid rgba(176,0,0,0.3)">
        <div style="background:linear-gradient(to right,#b00000,#900000);padding:30px;text-align:center">
          <div style="font-size:32px;font-weight:900;color:#fff">SALIM LEE</div>
          <div style="color:#fff;letter-spacing:3px;font-size:12px;opacity:.9">BOXING &amp; FITNESS GYM</div>
        </div>
        <div style="padding:40px 30px">
          <h2 style="color:#ffa500;margin:0 0 10px">Offene Zahlung</h2>
          <p style="color:#a1a1aa;line-height:1.8">Hallo <strong style="color:#fafafa">${c.name}</strong>,<br><br>
          bei deiner Mitgliedschaft ist eine Zahlung offen geblieben (SEPA-Lastschrift nicht eingezogen).
          Bitte begleiche den offenen Betrag direkt &uuml;ber den Button — sicher &uuml;ber Stripe.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">${rows}
            <tr><td style="padding:10px 0;border-top:1px solid #333;color:#fafafa;font-weight:bold">Gesamt</td>
            <td style="padding:10px 0;border-top:1px solid #333;text-align:right;color:#ffa500;font-weight:bold">${eur(sum)}</td></tr></table>
          <div style="text-align:center;margin:30px 0">
            <a href="${payUrl}" style="display:inline-block;padding:16px 40px;background:linear-gradient(to right,#b00000,#900000);color:#fff;font-weight:bold;text-decoration:none;border-radius:8px">Jetzt bezahlen</a>
          </div>
          <p style="color:#a1a1aa;line-height:1.8">Fragen? <a href="mailto:info@salimlee-gym.de" style="color:#b00000">info@salimlee-gym.de</a> · +49 151 68457943</p>
          <p style="color:#a1a1aa;margin-top:24px">Sportliche Gr&uuml;&szlig;e,<br><strong style="color:#b00000">Dein Salim Lee Team</strong></p>
        </div>
        <div style="background:#09090b;padding:20px;text-align:center;color:#71717a;font-size:12px">W&ouml;rthstrasse 17, 72764 Reutlingen</div>
      </div></body></html>`,
    })
    if (error) { aErr++; console.log(`   ✗ ${c.email}: ${error.message}`) }
    else { aOk++; console.log(`   ✓ Zahllink → ${c.email} (${eur(sum)})`) }
  } catch (e) { aErr++; console.log(`   ✗ ${c.email}: ${e.message}`) }
}

for (const r of reactivations) {
  try {
    // DB auf Reaktivierung stellen (wie der Dashboard-Button)
    await supabase.from('subscriptions').update({ status: 'pending', payment_status: 'reactivation_pending', stripe_subscription_id: null }).eq('id', r.subscriptionId)
    const res = await fetch(`${BASE}/api/subscription/send-reminder`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionId: r.subscriptionId, memberEmail: r.email, memberName: r.memberName, subscriptionName: r.name, reason: 'payment_failed' }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.error) { bErr++; console.log(`   ✗ Reaktivierung ${r.email}: ${data.error || res.status}`) }
    else { bOk++; console.log(`   ✓ Reaktivierung → ${r.email} (${r.name})`) }
  } catch (e) { bErr++; console.log(`   ✗ Reaktivierung ${r.email}: ${e.message}`) }
}

console.log(`\n✓ Fertig. Zahllinks: ${aOk} ok / ${aErr} Fehler · Reaktivierungen: ${bOk} ok / ${bErr} Fehler\n`)
