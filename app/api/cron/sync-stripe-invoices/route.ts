import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncStripeInvoices } from '@/lib/stripe-invoice-sync'
import { stripe, DUNNING_FEE, getOrCreateDunningFeeProduct, getOrCreateTaxRate } from '@/lib/stripe'
import { buildContractReminderEmail } from '@/lib/contract-reminder-email'

/**
 * Mahngebühr-Pass: addiert €4 pro ÜBERFÄLLIGER Abo-Rechnung (Rückstand), dedupliziert
 * pro Rechnung. So akkumulieren sich Mahngebühren monatlich (jeder unbezahlte Monat = eine
 * überfällige Rechnung = eine €4-Gebühr). Die Gebühr wird als pending Invoice-Item an die
 * Subscription gehängt → landet auf der nächsten Abo-Rechnung, sodass Abo + Mahngebühr
 * zusammen eingezogen werden können.
 *
 * WICHTIG:
 *  - Nur bei AKTIVEN Abos (active/past_due/unpaid/trialing) — nicht bei gekündigten.
 *  - Respektiert den Abrechnungstag automatisch über das jeweilige due_date der Rechnung
 *    (7-Tage-SEPA-Karenz) → funktioniert für 1.-des-Monats- UND 15.-des-Monats-Zahler.
 */
async function applyOverdueDunningFees() {
  const GRACE_MS = 7 * 24 * 60 * 60 * 1000
  const now = Date.now()

  // Live-Abos einsammeln — nur dort macht eine Mahngebühr Sinn.
  const liveSubs = new Set<string>()
  for await (const s of stripe.subscriptions.list({ status: 'all', limit: 100 })) {
    if (['active', 'past_due', 'unpaid', 'trialing'].includes(s.status)) liveSubs.add(s.id)
  }

  const [productId, taxRateId] = await Promise.all([
    getOrCreateDunningFeeProduct(),
    getOrCreateTaxRate(),
  ])

  let added = 0
  let skipped = 0
  for await (const inv of stripe.invoices.list({ status: 'open', limit: 100 })) {
    const remaining = inv.amount_due - (inv.amount_paid || 0)
    if (remaining <= 0) { skipped++; continue }

    const subRef = (inv as unknown as { subscription?: string | { id?: string } | null }).subscription
    const subId = typeof subRef === 'string' ? subRef : subRef?.id
    if (!subId || !liveSubs.has(subId)) { skipped++; continue } // nur aktive Abo-Rechnungen

    // Überfällig? (Fälligkeitsdatum + Karenz) — respektiert den Abrechnungstag der Rechnung.
    const dueMs = (inv.due_date || inv.created) * 1000
    if (dueMs + GRACE_MS >= now) { skipped++; continue } // noch in Karenz → keine Gebühr

    const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id
    if (!customerId) { skipped++; continue }

    // Dedup: pro überfälliger Rechnung nur EINE Mahngebühr.
    const existing = await stripe.invoiceItems.list({ customer: customerId, limit: 100, pending: true })
    const already = existing.data.some(
      it => it.metadata?.type === 'dunning_fee' && it.metadata?.failed_invoice_id === inv.id
    )
    if (already) { skipped++; continue }

    await stripe.invoiceItems.create({
      customer: customerId,
      subscription: subId,
      amount: DUNNING_FEE.unitAmount,
      currency: 'eur',
      description: `${DUNNING_FEE.name} (Rückstand ${inv.number || inv.id})`,
      tax_rates: [taxRateId],
      metadata: {
        type: 'dunning_fee',
        product_id: productId,
        failed_invoice_id: inv.id as string,
        source: 'cron',
      },
    })
    added++
  }

  return { added, skipped }
}

/**
 * Vertrags-Erinnerungen: informiert Kunden automatisch, deren MINDESTLAUFZEIT in den
 * nächsten 30 Tagen endet — Mitgliedschaft läuft danach monatlich kündbar weiter.
 *
 * WICHTIG: fasst STRIPE NICHT an, ändert KEIN Abo. Nur E-Mail. Dedup über
 * subscriptions.contract_reminder_sent_at → jedes Abo bekommt die Mail nur EINMAL,
 * egal wie oft der Cron läuft. Fehlt Migration 010, liefert die Query einen Fehler,
 * der abgefangen wird — nichts bricht.
 */
async function sendDueContractReminders() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select('id, name, end_date, type, contract_reminder_sent_at, members:member_id(name,email)')
    .eq('status', 'active')
    .not('end_date', 'is', null)
    .gte('end_date', today)
    .lte('end_date', in30)
  if (error) return { sent: 0, note: 'Migration 010 evtl. fehlt: ' + error.message }
  if (!process.env.RESEND_API_KEY) return { sent: 0, note: 'RESEND fehlt' }

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM = process.env.EMAIL_FROM || 'Salim Lee Gym <noreply@salimlee-gym.de>'

  let sent = 0
  for (const s of (subs || []) as Array<Record<string, unknown> & { members?: { name?: string; email?: string } | { name?: string; email?: string }[] }>) {
    if (s.type === 'punch_card' || s.contract_reminder_sent_at) continue // Mehrfachkarte / schon erinnert
    const m = Array.isArray(s.members) ? s.members[0] : s.members
    if (!m?.email) continue
    try {
      const { subject, html } = buildContractReminderEmail({ memberName: m.name || 'Mitglied', subscriptionName: s.name as string, endDate: s.end_date as string })
      const { error: e } = await resend.emails.send({ from: FROM, to: m.email, subject, html })
      if (e) continue
      await supabase.from('subscriptions').update({ contract_reminder_sent_at: new Date().toISOString() }).eq('id', s.id as string)
      sent++
    } catch { /* einzelnen Fehler überspringen */ }
  }
  return { sent }
}

export async function GET(request: NextRequest) {
  // Vercel Cron Auth
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await syncStripeInvoices(30)
    let dunning = { added: 0, skipped: 0 }
    try {
      dunning = await applyOverdueDunningFees()
    } catch (e) {
      console.warn('Mahngebühr-Pass fehlgeschlagen:', e)
    }
    let contractReminders: { sent: number; note?: string } = { sent: 0 }
    try {
      contractReminders = await sendDueContractReminders()
    } catch (e) {
      console.warn('Vertrags-Erinnerungs-Pass fehlgeschlagen:', e)
    }
    console.log('Cron Sync + Mahngebühr + Vertrags-Erinnerung:', { result, dunning, contractReminders })
    return NextResponse.json({ ...result, dunning, contractReminders })
  } catch (error) {
    console.error('Cron Sync fehlgeschlagen:', error)
    return NextResponse.json({ error: 'Sync fehlgeschlagen' }, { status: 500 })
  }
}
