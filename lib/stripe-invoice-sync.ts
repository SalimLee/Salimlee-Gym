import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Stripe status -> invoices table status
function mapStripeStatus(stripeStatus: string): 'open' | 'paid' | 'overdue' | 'cancelled' {
  switch (stripeStatus) {
    case 'paid': return 'paid'
    case 'open': return 'open'
    case 'void': return 'cancelled'
    case 'uncollectible': return 'overdue'
    case 'draft': return 'open'
    default: return 'open'
  }
}

// Generate invoice number: RE-YYYYMM-###
// Schaut nach der höchsten vorhandenen Nummer (statt count) — count zählt evtl. weniger als das Max,
// wenn Rechnungen gelöscht wurden, was zu Duplikat-Inserts und Race-Conditions führt.
async function generateInvoiceNumber(date: Date): Promise<string> {
  const prefix = `RE-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-`
  const { data } = await supabaseAdmin
    .from('invoices')
    .select('invoice_number')
    .like('invoice_number', `${prefix}%`)
    .order('invoice_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  const lastNum = data?.invoice_number ? parseInt(String(data.invoice_number).split('-').pop() || '0', 10) : 0
  return `${prefix}${String(lastNum + 1).padStart(3, '0')}`
}

// Find member_id by Stripe customer ID — with email fallback
async function findMemberByStripeCustomer(stripeCustomerId: string): Promise<string | null> {
  // 1. Direkt via stripe_customer_id auf einer beliebigen Subscription
  const { data: subMatch } = await supabaseAdmin
    .from('subscriptions')
    .select('member_id')
    .eq('stripe_customer_id', stripeCustomerId)
    .limit(1)
    .maybeSingle()
  if (subMatch?.member_id) return subMatch.member_id

  // 2. Fallback: Customer aus Stripe holen, Email lesen, Member via Email finden.
  //    Nötig wenn ein Sync läuft bevor checkout.session.completed die stripe_customer_id auf der Sub gesetzt hat.
  try {
    const customer = await stripe.customers.retrieve(stripeCustomerId)
    if (!customer.deleted && customer.email) {
      const { data: memberMatch } = await supabaseAdmin
        .from('members')
        .select('id')
        .ilike('email', customer.email)
        .limit(1)
        .maybeSingle()
      if (memberMatch?.id) {
        // Backfill: stripe_customer_id auf allen Subs des Members setzen, die noch keine haben
        await supabaseAdmin
          .from('subscriptions')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('member_id', memberMatch.id)
          .is('stripe_customer_id', null)
        return memberMatch.id
      }
    }
  } catch (e) {
    console.warn(`Customer ${stripeCustomerId} konnte nicht via Email gematcht werden:`, e)
  }

  return null
}

interface SyncResult {
  synced: number
  updated: number
  skipped: number
  errors: string[]
}

/**
 * Synchronisiert Stripe-Invoices in die lokale invoices Tabelle.
 * Wird sowohl vom Cron-Job als auch vom manuellen Sync-Button genutzt.
 */
export async function syncStripeInvoices(daysBack = 30): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, updated: 0, skipped: 0, errors: [] }

  const since = Math.floor(Date.now() / 1000) - daysBack * 24 * 60 * 60

  // Fetch Stripe invoices (paginated)
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const params: Stripe.InvoiceListParams = {
      created: { gte: since },
      limit: 100,
      expand: ['data.customer'],
    }
    if (startingAfter) params.starting_after = startingAfter

    let invoices: Stripe.ApiList<Stripe.Invoice>
    try {
      invoices = await stripe.invoices.list(params)
    } catch (e) {
      result.errors.push(`Stripe API Fehler: ${e}`)
      break
    }

    for (const inv of invoices.data) {
      try {
        // Skip draft invoices
        if (inv.status === 'draft') {
          result.skipped++
          continue
        }

        const stripeInvoiceId = inv.id
        const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id

        // Check if already exists
        const { data: existing } = await supabaseAdmin
          .from('invoices')
          .select('id, status')
          .eq('stripe_invoice_id', stripeInvoiceId)
          .maybeSingle()

        if (existing) {
          // Update status + pdf url
          const newStatus = mapStripeStatus(inv.status || 'open')
          await supabaseAdmin
            .from('invoices')
            .update({
              status: newStatus,
              paid_date: inv.status === 'paid' && inv.status_transitions?.paid_at
                ? new Date(inv.status_transitions.paid_at * 1000).toISOString().split('T')[0]
                : undefined,
              stripe_invoice_pdf_url: inv.invoice_pdf || null,
            })
            .eq('id', existing.id)
          result.updated++
          continue
        }

        // Find member
        let memberId: string | null = null
        if (customerId) {
          memberId = await findMemberByStripeCustomer(customerId)
        }

        if (!memberId) {
          result.skipped++
          continue
        }

        // Build description from line items
        const lineItems = inv.lines?.data || []
        const description = lineItems.length > 0
          ? lineItems.map(li => li.description || 'Abo').join(', ')
          : 'Stripe-Zahlung'

        const invoiceDate = new Date((inv.created || Date.now() / 1000) * 1000)
        const invoiceNumber = await generateInvoiceNumber(invoiceDate)

        const amount = (inv.amount_paid || inv.total || 0) / 100 // Cent -> Euro

        await supabaseAdmin.from('invoices').insert({
          member_id: memberId,
          invoice_number: invoiceNumber,
          description,
          amount,
          status: mapStripeStatus(inv.status || 'open'),
          due_date: inv.due_date
            ? new Date(inv.due_date * 1000).toISOString().split('T')[0]
            : invoiceDate.toISOString().split('T')[0],
          paid_date: inv.status === 'paid' && inv.status_transitions?.paid_at
            ? new Date(inv.status_transitions.paid_at * 1000).toISOString().split('T')[0]
            : null,
          source: 'stripe',
          stripe_invoice_id: stripeInvoiceId,
          stripe_invoice_pdf_url: inv.invoice_pdf || null,
          notes: inv.number ? `Stripe: ${inv.number}` : null,
        })

        result.synced++
      } catch (e) {
        result.errors.push(`Invoice ${inv.id}: ${e}`)
      }
    }

    hasMore = invoices.has_more
    if (invoices.data.length > 0) {
      startingAfter = invoices.data[invoices.data.length - 1].id
    }
  }

  return result
}

/**
 * Upsert einer einzelnen Stripe Invoice (genutzt vom Webhook).
 */
export async function upsertStripeInvoice(stripeInvoiceId: string): Promise<void> {
  const inv = await stripe.invoices.retrieve(stripeInvoiceId)
  if (inv.status === 'draft') return

  const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id
  const { data: existing } = await supabaseAdmin
    .from('invoices')
    .select('id')
    .eq('stripe_invoice_id', stripeInvoiceId)
    .maybeSingle()

  if (existing) {
    await supabaseAdmin
      .from('invoices')
      .update({
        status: mapStripeStatus(inv.status || 'open'),
        paid_date: inv.status === 'paid' && inv.status_transitions?.paid_at
          ? new Date(inv.status_transitions.paid_at * 1000).toISOString().split('T')[0]
          : undefined,
        stripe_invoice_pdf_url: inv.invoice_pdf || null,
      })
      .eq('id', existing.id)
    return
  }

  // New invoice — find member
  let memberId: string | null = null
  if (customerId) {
    memberId = await findMemberByStripeCustomer(customerId)
  }
  if (!memberId) return

  const lineItems = inv.lines?.data || []
  const description = lineItems.length > 0
    ? lineItems.map(li => li.description || 'Abo').join(', ')
    : 'Stripe-Zahlung'

  const invoiceDate = new Date((inv.created || Date.now() / 1000) * 1000)
  const invoiceNumber = await generateInvoiceNumber(invoiceDate)
  const amount = (inv.amount_paid || inv.total || 0) / 100

  await supabaseAdmin.from('invoices').insert({
    member_id: memberId,
    invoice_number: invoiceNumber,
    description,
    amount,
    status: mapStripeStatus(inv.status || 'open'),
    due_date: inv.due_date
      ? new Date(inv.due_date * 1000).toISOString().split('T')[0]
      : invoiceDate.toISOString().split('T')[0],
    paid_date: inv.status === 'paid' && inv.status_transitions?.paid_at
      ? new Date(inv.status_transitions.paid_at * 1000).toISOString().split('T')[0]
      : null,
    source: 'stripe',
    stripe_invoice_id: stripeInvoiceId,
    stripe_invoice_pdf_url: inv.invoice_pdf || null,
    notes: inv.number ? `Stripe: ${inv.number}` : null,
  })
}
