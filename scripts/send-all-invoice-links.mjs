/**
 * Schickt JEDEM Kunden mit offenen Stripe-Rechnungen einen direkten Zahllink
 * (hosted_invoice_url) für ALLE seine offenen Rechnungen — eine Mail pro Kunde,
 * alle offenen Posten gelistet + Gesamtsumme. KEIN Stornieren.
 *
 * Vorschau:  node --env-file=.env scripts/send-all-invoice-links.mjs
 * Senden:    node --env-file=.env scripts/send-all-invoice-links.mjs --send
 */
import Stripe from 'stripe'
import { Resend } from 'resend'

const SEND = process.argv.includes('--send')
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM || 'Salim Lee Gym <noreply@salimlee-gym.de>'
const eur = (c) => `${(c / 100).toFixed(2)} €`

console.log(`\n── Zahllinks für ALLE offenen Rechnungen · ${SEND ? 'SENDEN (live!)' : 'VORSCHAU'} ──\n`)

const emCache = new Map()
async function cust(cid) {
  if (emCache.has(cid)) return emCache.get(cid)
  let v = { email: null, name: 'Mitglied' }
  try { const c = await stripe.customers.retrieve(cid); if (c && !c.deleted) v = { email: c.email, name: c.name || 'Mitglied' } } catch {}
  emCache.set(cid, v); return v
}

// offene Rechnungen mit Restbetrag pro Kunde sammeln
const byCust = new Map()
for await (const inv of stripe.invoices.list({ status: 'open', limit: 100 })) {
  const rem = inv.amount_due - (inv.amount_paid || 0)
  if (rem <= 0 || !inv.hosted_invoice_url) continue
  const cid = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id
  const ci = await cust(cid)
  const email = inv.customer_email || ci.email
  if (!email) continue
  if (!byCust.has(cid)) byCust.set(cid, { email, name: inv.customer_name || ci.name, items: [] })
  byCust.get(cid).items.push({ number: inv.number || inv.id, amount: rem, url: inv.hosted_invoice_url, desc: inv.lines?.data?.[0]?.description || '' })
}

console.log(`Kunden mit offenen Rechnungen: ${byCust.size}\n`)
let total = 0
for (const [, c] of byCust) {
  const sum = c.items.reduce((s, i) => s + i.amount, 0); total += sum
  console.log(`   ${c.name} <${c.email}> — ${c.items.length} Rechnung(en), gesamt ${eur(sum)}`)
  for (const i of c.items) console.log(`        ${i.number}  ${eur(i.amount)}`)
}
console.log(`\nGesamtsumme offen: ${eur(total)}`)

if (!SEND) { console.log('\n(Vorschau — nichts gesendet. Mit --send senden.)\n'); process.exit(0) }

let ok = 0, err = 0
for (const [, c] of byCust) {
  const sum = c.items.reduce((s, i) => s + i.amount, 0)
  const rows = c.items.map(i => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #2a2a2e;color:#a1a1aa">${i.number}<br><span style="color:#71717a;font-size:12px">${i.desc || ''}</span></td>
      <td style="padding:10px 0;border-bottom:1px solid #2a2a2e;text-align:right;color:#fafafa;font-weight:bold;white-space:nowrap">${eur(i.amount)}</td>
      <td style="padding:10px 0 10px 14px;border-bottom:1px solid #2a2a2e;text-align:right;white-space:nowrap">
        <a href="${i.url}" style="display:inline-block;padding:8px 16px;background:#b00000;color:#fff;font-size:13px;font-weight:bold;text-decoration:none;border-radius:6px">Bezahlen</a>
      </td>
    </tr>`).join('')
  try {
    const { error } = await resend.emails.send({
      from: FROM, to: c.email,
      subject: `Offene Zahlung${c.items.length > 1 ? 'en' : ''} – bitte begleichen | Salim Lee Gym`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
      <body style="font-family:Arial,sans-serif;background:#09090b;margin:0;padding:20px">
      <div style="max-width:600px;margin:0 auto;background:#18181b;border-radius:16px;overflow:hidden;border:1px solid rgba(176,0,0,0.3)">
        <div style="background:linear-gradient(to right,#b00000,#900000);padding:30px;text-align:center">
          <div style="font-size:32px;font-weight:900;color:#fff">SALIM LEE</div>
          <div style="color:#fff;letter-spacing:3px;font-size:12px;opacity:.9">BOXING &amp; FITNESS GYM</div>
        </div>
        <div style="padding:40px 30px">
          <h2 style="color:#ffa500;margin:0 0 10px">Offene Zahlung${c.items.length > 1 ? 'en' : ''}</h2>
          <p style="color:#a1a1aa;line-height:1.8">Hallo <strong style="color:#fafafa">${c.name}</strong>,<br><br>
          bei deiner Mitgliedschaft ${c.items.length > 1 ? 'sind folgende Zahlungen' : 'ist folgende Zahlung'} offen geblieben
          (SEPA-Lastschrift konnte nicht eingezogen werden). Bitte begleiche ${c.items.length > 1 ? 'die Beträge' : 'den Betrag'}
          direkt &uuml;ber ${c.items.length > 1 ? 'die Buttons' : 'den Button'} — sicher &uuml;ber Stripe.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">${rows}
            <tr><td style="padding:12px 0;color:#fafafa;font-weight:bold">Gesamt offen</td>
            <td style="padding:12px 0;text-align:right;color:#ffa500;font-weight:bold">${eur(sum)}</td><td></td></tr>
          </table>
          <p style="color:#a1a1aa;line-height:1.8">Deine Mitgliedschaft ist vertraglich vereinbart — bitte gleiche den offenen Betrag zeitnah aus.
          Fragen? <a href="mailto:info@salimlee-gym.de" style="color:#b00000">info@salimlee-gym.de</a> · +49 151 68457943</p>
          <p style="color:#a1a1aa;margin-top:24px">Sportliche Gr&uuml;&szlig;e,<br><strong style="color:#b00000">Dein Salim Lee Team</strong></p>
        </div>
        <div style="background:#09090b;padding:20px;text-align:center;color:#71717a;font-size:12px">W&ouml;rthstrasse 17, 72764 Reutlingen</div>
      </div></body></html>`,
    })
    if (error) { err++; console.log(`   ✗ ${c.email}: ${error.message}`) }
    else { ok++; console.log(`   ✓ ${c.email} (${eur(sum)}, ${c.items.length} Rechnung(en))`) }
  } catch (e) { err++; console.log(`   ✗ ${c.email}: ${e.message}`) }
}
console.log(`\n✓ Fertig. ${ok} gesendet / ${err} Fehler.\n`)
