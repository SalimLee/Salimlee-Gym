import { NextRequest, NextResponse } from 'next/server'
import { stripe, SERVICE_FEE, DUNNING_FEE, getOrCreateServiceFeeProduct, getOrCreateDunningFeeProduct, getOrCreateTaxRate } from '@/lib/stripe'
import { upsertStripeInvoice } from '@/lib/stripe-invoice-sync'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Webhook signature oder secret fehlt' },
        { status: 400 }
      )
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      )
    } catch (err) {
      console.error('Webhook Signatur-Verifikation fehlgeschlagen:', err)
      return NextResponse.json(
        { error: 'Ungültige Webhook-Signatur' },
        { status: 400 }
      )
    }

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session
        const subscriptionId = session.metadata?.subscription_id

        if (!subscriptionId) {
          console.warn(`${event.type} ohne subscription_id metadata`)
          break
        }

        // session.payment_status: 'paid' | 'unpaid' | 'no_payment_required'
        // Bei SEPA ist es initial 'unpaid' und wird erst mit async_payment_succeeded 'paid'.
        const isPaid = session.payment_status === 'paid' || session.payment_status === 'no_payment_required'
        const isFailed = event.type === 'checkout.session.async_payment_failed'

        const updateData: Record<string, string> = {}

        if (isFailed) {
          updateData.payment_status = 'failed'
        } else if (isPaid) {
          updateData.status = 'active'
          updateData.payment_status = 'paid'
        } else {
          // SEPA in Bearbeitung — Session erfolgreich abgeschlossen, Zahlung aber noch nicht bestätigt
          updateData.payment_status = 'processing'
        }

        // Stripe Subscription ID speichern (auch bei pending SEPA schon verfügbar)
        const stripeSubId = (session as unknown as Record<string, unknown>).subscription as string | null
        if (stripeSubId) {
          updateData.stripe_subscription_id = stripeSubId

          if (isPaid) {
            // WICHTIG: Die Vertragslaufzeit (cancel_after_months, z.B. 6/12 Monate) ist eine
            // MINDESTLAUFZEIT (Bindung) — KEIN Enddatum. Laut Vertrag verlängert sich die
            // Mitgliedschaft nach Ablauf der Mindestlaufzeit automatisch monatlich und ist
            // dann monatlich kündbar. Wir setzen daher BEWUSST KEIN `cancel_at` mehr — sonst
            // würde Stripe das Abo am Ende der Mindestlaufzeit beenden und die Abbuchungen
            // stoppen (Kunde erschien fälschlich als "gekündigt"). Die Sub läuft monatlich
            // weiter, bis der Coach sie im Dashboard manuell kündigt. Die Mindestlaufzeit
            // wird nur über subscriptions.end_date (Bindungs-Badge) im Dashboard getrackt.

            // Defensive: alle Stripe-Invoices dieser Sub auch direkt syncen.
            // Schützt vor dem Fall, dass invoice.paid Webhook später verpasst wird und
            // die initiale Invoice als "open" mit altem due_date in der DB hängen bleibt.
            try {
              const subInvoices = await stripe.invoices.list({ subscription: stripeSubId, limit: 20 })
              for (const subInv of subInvoices.data) {
                await upsertStripeInvoice(subInv.id)
              }
            } catch (e) {
              console.warn('Konnte Sub-Invoices nach Checkout nicht resyncen:', e)
            }
          }
        }

        // Stripe Customer ID speichern (wichtig für Invoice-Sync bei 10er-Karte)
        const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
        if (stripeCustomerId) {
          updateData.stripe_customer_id = stripeCustomerId
        }

        const { error: updErr } = await supabaseAdmin
          .from('subscriptions')
          .update(updateData)
          .eq('id', subscriptionId)

        if (updErr) {
          console.error(`Subscription-Update nach ${event.type} fehlgeschlagen:`, updErr)
        } else {
          console.log(`Subscription ${subscriptionId}: ${event.type} → ${JSON.stringify(updateData)}`)
        }

        // Bei 10er-Karte (payment mode) gibt es keine automatische Invoice.
        // Invoice wird stattdessen über payment_intent.succeeded / invoice.paid gesynct (siehe unten).
        break
      }

      case 'invoice.created': {
        // Servicepauschale: €30 alle 6 Monate automatisch auf die Rechnung drauf
        const createdInvoice = event.data.object as Stripe.Invoice
        const invoiceSubId = (createdInvoice as unknown as Record<string, unknown>).subscription as string | null

        if (invoiceSubId && createdInvoice.billing_reason === 'subscription_cycle') {
          try {
            const sub = await stripe.subscriptions.retrieve(invoiceSubId)
            const membershipId = sub.metadata?.membership_id

            // Nur für recurring Abos (keine 10er Karte)
            if (membershipId && membershipId !== '10er_karte') {
              // Berechne welcher Monat das ist seit Subscription-Start
              const anchorDate = new Date((sub.start_date || sub.created) * 1000)
              const now = new Date()
              const monthsSinceStart = (now.getFullYear() - anchorDate.getFullYear()) * 12 + (now.getMonth() - anchorDate.getMonth())

              // Alle 6 Monate die Servicepauschale draufpacken (Monat 6, 12, 18, ...)
              if (monthsSinceStart > 0 && monthsSinceStart % SERVICE_FEE.intervalMonths === 0) {
                const [productId, taxRateId] = await Promise.all([
                  getOrCreateServiceFeeProduct(),
                  getOrCreateTaxRate(),
                ])

                await stripe.invoiceItems.create({
                  customer: createdInvoice.customer as string,
                  invoice: createdInvoice.id,
                  amount: SERVICE_FEE.unitAmount,
                  currency: 'eur',
                  description: `${SERVICE_FEE.name} (halbjährlich)`,
                  tax_rates: [taxRateId],
                  metadata: {
                    type: 'service_fee',
                    product_id: productId,
                  },
                })

                console.log(`Servicepauschale (${SERVICE_FEE.unitAmount / 100}€) hinzugefügt für Subscription ${invoiceSubId} (Monat ${monthsSinceStart})`)
              }
            }
          } catch (e) {
            console.warn('Servicepauschale konnte nicht hinzugefügt werden:', e)
          }
        }
        break
      }

      case 'invoice.paid':
      case 'invoice.finalized':
      case 'invoice.voided':
      case 'invoice.marked_uncollectible': {
        // Stripe Invoice in lokale DB synchronisieren — auch voided/uncollectible,
        // damit alte fehlgeschlagene Initialzahlungs-Rechnungen nicht als "überfällig"
        // im Dashboard hängenbleiben (Stripe-Status void → lokal 'cancelled').
        const syncInvoice = event.data.object as Stripe.Invoice
        try {
          await upsertStripeInvoice(syncInvoice.id)
          console.log(`Stripe Invoice ${syncInvoice.id} synchronisiert (${event.type})`)

          // Bei bezahlter Invoice auch Subscription auf 'active' + 'paid' setzen
          // (wichtig für SEPA-Subscriptions, bei denen async_payment_succeeded nicht immer feuert)
          if (event.type === 'invoice.paid') {
            const invSubId = (syncInvoice as unknown as Record<string, unknown>).subscription as string | null
            if (invSubId) {
              const { error: sErr } = await supabaseAdmin
                .from('subscriptions')
                .update({ status: 'active', payment_status: 'paid' })
                .eq('stripe_subscription_id', invSubId)
              if (sErr) console.warn('Subscription-Update nach invoice.paid fehlgeschlagen:', sErr)
            }
          }
        } catch (e) {
          console.warn('Invoice Sync fehlgeschlagen:', e)
        }
        break
      }

      case 'payment_intent.succeeded': {
        // Für 10er-Karte (payment mode): keine Invoice wird automatisch erstellt.
        // Wir erstellen einen invoices-Eintrag manuell, damit im Rechnungen-Tab auftaucht.
        const pi = event.data.object as Stripe.PaymentIntent
        const subscriptionId = pi.metadata?.subscription_id

        try {
          // Subscription in Supabase auf active+paid setzen (falls Metadata vorhanden)
          if (subscriptionId) {
            const { error: sErr } = await supabaseAdmin
              .from('subscriptions')
              .update({ status: 'active', payment_status: 'paid' })
              .eq('id', subscriptionId)
            if (sErr) console.warn('Subscription-Update nach payment_intent.succeeded fehlgeschlagen:', sErr)
          }

          // Wenn PaymentIntent zu einer Invoice gehört, überlassen wir das dem invoice.paid Handler.
          const piInvoice = (pi as unknown as Record<string, unknown>).invoice as string | null
          if (piInvoice) {
            console.log(`payment_intent.succeeded → Invoice ${piInvoice}, wird via invoice.paid gesynct`)
            break
          }

          // Nur für one-time Zahlungen (10er-Karte) ohne Invoice: Eintrag manuell erstellen
          const customerId = typeof pi.customer === 'string' ? pi.customer : pi.customer?.id
          if (!customerId) {
            console.warn('payment_intent.succeeded ohne customer — skip')
            break
          }

          // Member finden via stripe_customer_id
          const { data: memberSub } = await supabaseAdmin
            .from('subscriptions')
            .select('member_id, name')
            .eq('stripe_customer_id', customerId)
            .limit(1)
            .maybeSingle()

          if (!memberSub?.member_id) {
            console.warn(`payment_intent.succeeded: kein Member für customer ${customerId} gefunden`)
            break
          }

          // Dedup via notes (wir haben keine dedizierte payment_intent_id Spalte)
          const notesMarker = `stripe_pi:${pi.id}`
          const { data: existing } = await supabaseAdmin
            .from('invoices')
            .select('id')
            .like('notes', `%${notesMarker}%`)
            .maybeSingle()

          if (existing) {
            console.log(`PaymentIntent ${pi.id} bereits als Invoice erfasst`)
            break
          }

          // Rechnungsnummer generieren
          const now = new Date()
          const prefix = `RE-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-`
          const { count } = await supabaseAdmin
            .from('invoices')
            .select('*', { count: 'exact', head: true })
            .like('invoice_number', `${prefix}%`)
          const invoiceNumber = `${prefix}${String((count || 0) + 1).padStart(3, '0')}`

          const { error: insErr } = await supabaseAdmin.from('invoices').insert({
            member_id: memberSub.member_id,
            invoice_number: invoiceNumber,
            description: memberSub.name || 'Stripe-Einmalzahlung',
            amount: pi.amount_received / 100,
            status: 'paid',
            due_date: now.toISOString().split('T')[0],
            paid_date: now.toISOString().split('T')[0],
            source: 'stripe',
            notes: notesMarker,
          })

          if (insErr) {
            console.error('Invoice-Insert für 10er-Karte fehlgeschlagen:', insErr)
          } else {
            console.log(`Invoice ${invoiceNumber} für PaymentIntent ${pi.id} erstellt (${pi.amount_received / 100} €)`)
          }
        } catch (e) {
          console.warn('payment_intent.succeeded Handler fehlgeschlagen:', e)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const stripeSubId = (invoice as unknown as Record<string, unknown>).subscription as string | null

        if (stripeSubId) {
          await supabaseAdmin
            .from('subscriptions')
            .update({ payment_status: 'failed' })
            .eq('stripe_subscription_id', stripeSubId)

          console.log(`Zahlung fehlgeschlagen für Stripe Subscription ${stripeSubId} (attempt ${invoice.attempt_count})`)
        }

        // Mahngebühr 4€ ab dem 2. fehlgeschlagenen Versuch — einmalig pro Invoice anhängen,
        // wird dann von Stripe automatisch beim nächsten Abrechnungslauf (Smart Retries oder
        // nächster regulärer Sub-Zyklus) an die Customer-Rechnung gepackt.
        const attemptCount = invoice.attempt_count || 0
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
        if (attemptCount >= DUNNING_FEE.triggerAttempt && customerId && stripeSubId) {
          try {
            // Dedup: pro failed Invoice nur einmal Mahngebühr anlegen.
            // Wir markieren via Stripe-Metadata auf dem Invoice-Item.
            const dedupKey = `inv:${invoice.id}`
            const existingItems = await stripe.invoiceItems.list({ customer: customerId, limit: 100, pending: true })
            const alreadyCharged = existingItems.data.some(
              it => it.metadata?.type === 'dunning_fee' && it.metadata?.failed_invoice_id === invoice.id
            )
            if (alreadyCharged) {
              console.log(`Mahngebühr für ${invoice.id} bereits vorhanden — übersprungen`)
            } else {
              const [productId, taxRateId] = await Promise.all([
                getOrCreateDunningFeeProduct(),
                getOrCreateTaxRate(),
              ])
              await stripe.invoiceItems.create({
                customer: customerId,
                subscription: stripeSubId,
                amount: DUNNING_FEE.unitAmount,
                currency: 'eur',
                description: `${DUNNING_FEE.name} (Rechnung ${invoice.number || invoice.id})`,
                tax_rates: [taxRateId],
                metadata: {
                  type: 'dunning_fee',
                  product_id: productId,
                  failed_invoice_id: invoice.id as string,
                  dedup_key: dedupKey,
                  attempt_count: String(attemptCount),
                },
              })
              console.log(`Mahngebühr ${DUNNING_FEE.unitAmount / 100}€ für Sub ${stripeSubId} angelegt (failed invoice ${invoice.id}, attempt ${attemptCount})`)
            }
          } catch (e) {
            console.warn('Mahngebühr konnte nicht angelegt werden:', e)
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const subId = subscription.metadata?.subscription_id

        if (subId) {
          const { data: existing } = await supabaseAdmin
            .from('subscriptions')
            .select('status, stripe_subscription_id')
            .eq('id', subId)
            .maybeSingle()

          // SCHUTZ vor Multi-Checkout: wenn der Coach mehrfach Checkout-Links generiert
          // hat, gibt es ggf. mehrere Stripe-Subs für dieselbe lokale Sub. Stripe löscht die
          // alten (incomplete_expired) → wir würden lokal fälschlich auf 'cancelled' setzen,
          // obwohl die NEUE Stripe-Sub gerade aktiv ist. Wenn die DB einen anderen Stripe-ID
          // hält als die gerade gelöschte, ignorieren wir das Event.
          if (existing?.stripe_subscription_id && existing.stripe_subscription_id !== subscription.id) {
            console.log(`Sub ${subId}: ignore deletion of obsolete Stripe sub ${subscription.id} (current: ${existing.stripe_subscription_id})`)
            // Trotzdem deren Invoices voidieren, damit sie nicht als "open/überfällig" rumstehen
            try {
              const obsoleteInvs = await stripe.invoices.list({ subscription: subscription.id, limit: 50 })
              for (const obsInv of obsoleteInvs.data) {
                if (obsInv.status !== 'paid') {
                  await upsertStripeInvoice(obsInv.id)
                }
              }
            } catch (e) {
              console.warn('Konnte Invoices der obsoleten Sub nicht resyncen:', e)
            }
            break
          }

          if (existing?.status === 'pending') {
            // Initialzahlung nie erfolgreich → lokal pending lassen, Coach soll manuell entscheiden
            console.log(`Subscription ${subId}: Stripe-Sub gelöscht, lokal pending — bleibt pending`)
          } else {
            await supabaseAdmin
              .from('subscriptions')
              .update({ status: 'cancelled', payment_status: 'cancelled' })
              .eq('id', subId)
            console.log(`Subscription ${subId} gekündigt`)
          }
        }
        break
      }

      default:
        // Unhandled event type
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook Verarbeitung fehlgeschlagen:', error)
    return NextResponse.json(
      { error: 'Webhook Verarbeitung fehlgeschlagen' },
      { status: 500 }
    )
  }
}
