import { NextRequest, NextResponse } from 'next/server'
import { stripe, getOrCreateStripePrice, getOrCreateStripeCustomer, getOrCreateTaxRate, MEMBERSHIP_STRIPE_MAP } from '@/lib/stripe'
import { computeProratedFirstMonth, upsertFirstMonthInvoiceItem } from '@/lib/stripe-billing'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Reverse-lookup: find membershipId by subscription display name.
// Use substring matching with longest-name preference, damit:
//   - Schüler-Subs mit Suffix "(Nachweis erforderlich)" matchen
//   - Custom-Action-Subs mit Prefix "Aktion: …" und Suffix "(Xeur für Y Monate)" matchen
//   - Label-Drift in MEMBERSHIP_OPTIONS nicht den Reminder bricht
function findMembershipId(subscriptionName: string): string | null {
  // Exact-match zuerst (Standard-Tarife) — schnellster Pfad
  for (const [id, config] of Object.entries(MEMBERSHIP_STRIPE_MAP)) {
    if (config.name === subscriptionName) return id
  }
  // Fallback: längste enthaltene Map-Name gewinnt (vermeidet "6 Monate" matcht "12 Monate"-Inhalte)
  let bestId: string | null = null
  let bestLen = 0
  for (const [id, config] of Object.entries(MEMBERSHIP_STRIPE_MAP)) {
    if (subscriptionName.includes(config.name) && config.name.length > bestLen) {
      bestId = id
      bestLen = config.name.length
    }
  }
  return bestId
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe nicht konfiguriert' }, { status: 500 })
    }
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Resend nicht konfiguriert' }, { status: 500 })
    }

    const { subscriptionId, memberEmail, memberName, subscriptionName } = await request.json()

    if (!subscriptionId || !memberEmail || !memberName || !subscriptionName) {
      return NextResponse.json({ error: 'subscriptionId, memberEmail, memberName und subscriptionName sind erforderlich' }, { status: 400 })
    }

    const membershipId = findMembershipId(subscriptionName)
    if (!membershipId) {
      return NextResponse.json({ error: `Unbekannte Mitgliedschaft: ${subscriptionName}` }, { status: 400 })
    }

    const config = MEMBERSHIP_STRIPE_MAP[membershipId]

    // Create new Stripe checkout session
    const [priceId, customerId, taxRateId] = await Promise.all([
      getOrCreateStripePrice(membershipId),
      getOrCreateStripeCustomer(memberEmail, memberName),
      getOrCreateTaxRate(),
    ])

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      customer: customerId,
      locale: 'de',
      success_url: `${baseUrl}/zahlung-erfolgreich?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/zahlung-abgebrochen`,
      metadata: {
        subscription_id: subscriptionId,
        membership_id: membershipId,
      },
      custom_text: {
        submit: {
          message: config.recurring
            ? 'Hinweis: Zusätzlich wird eine Servicepauschale von 30 € alle 6 Monate automatisch eingezogen.'
            : 'Einmalzahlung — keine weiteren Kosten.',
        },
      },
    }

    if (config.recurring) {
      sessionParams.mode = 'subscription'
      sessionParams.line_items = [{ price: priceId, quantity: 1, tax_rates: [taxRateId] }]

      // Faire Erste-Monat-Proration ab Vertragsabschluss — bzw. Reaktivierungs-Modus,
      // wenn der Coach das Abo wiederbelebt hat (siehe Detail-Doku in
      // lib/stripe-billing.ts und app/api/stripe/create-checkout/route.ts).
      const { data: dbSub } = await supabaseAdmin
        .from('subscriptions')
        .select('start_date, created_at, payment_status, member_id')
        .eq('id', subscriptionId)
        .maybeSingle()

      // Reaktivierungs-Flow nur wenn Marker gesetzt UND Member tatsächlich schon mal
      // eine paid Rechnung hatte. Sonst fallback auf anteilige Berechnung.
      let isReactivation = dbSub?.payment_status === 'reactivation_pending'
      if (isReactivation && dbSub?.member_id) {
        // Echte Reaktivierung nur wenn ein paid Betrag > 0 € existiert. 0 €-Invoices
        // (z.B. aus fehlerhaft 0 €-Initial-Checkouts) zählen NICHT. Sonst würde der
        // Coach mit "Erinnern" wieder einen 0 €-Link rausschicken statt anteilig.
        const { data: realPaidInvs } = await supabaseAdmin
          .from('invoices')
          .select('id')
          .eq('member_id', dbSub.member_id)
          .eq('status', 'paid')
          .gt('amount', 0)
          .limit(1)
        if (!realPaidInvs || realPaidInvs.length === 0) {
          console.warn(`Sub ${subscriptionId}: reactivation_pending aber keine paid Invoice mit Betrag > 0 — normale anteilige Anmeldung`)
          isReactivation = false
        }
      }

      const signupDate = dbSub?.start_date
        ? new Date(`${dbSub.start_date}T00:00:00Z`)
        : (dbSub?.created_at ? new Date(dbSub.created_at) : new Date())

      if (isReactivation) {
        // Karte hinterlegen, erste Abbuchung am 1. nächsten Monats voller Monat.
        // Keine anteilige Erstmonats-Rechnung — der Kunde hat schon einmal gezahlt.
        const now = new Date()
        const anchorDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
        const anchorUnix = Math.floor(anchorDate.getTime() / 1000)

        sessionParams.subscription_data = {
          billing_cycle_anchor: anchorUnix,
          proration_behavior: 'none',
          default_tax_rates: [taxRateId],
          metadata: {
            subscription_id: subscriptionId,
            membership_id: membershipId,
            is_reactivation: 'true',
            reactivated_at: now.toISOString().split('T')[0],
            anchor_date: anchorDate.toISOString().split('T')[0],
            ...(config.intervalCount ? { cancel_after_months: String(config.intervalCount) } : {}),
          },
        }
        // Bewusst KEIN upsertFirstMonthInvoiceItem — keine anteilige Berechnung.
      } else {
        // Anteilige Erstmonats-Berechnung via pending Invoice Item am Customer
        // (siehe ausführliche Doku in create-checkout/route.ts). Stripe legt das Item
        // beim Checkout-Complete automatisch auf die initial Invoice (durch trial_end).
        const plan = computeProratedFirstMonth(signupDate, config.unitAmount)

        await upsertFirstMonthInvoiceItem({
          stripe,
          customerId,
          subscriptionId,
          membershipId,
          taxRateId,
          plan,
        })

        sessionParams.subscription_data = {
          ...plan.billing,
          default_tax_rates: [taxRateId],
          metadata: {
            subscription_id: subscriptionId,
            membership_id: membershipId,
            signup_date: dbSub?.start_date || new Date().toISOString().split('T')[0],
            first_month_prorated_cents: String(plan.proratedCents),
            ...(config.intervalCount ? { cancel_after_months: String(config.intervalCount) } : {}),
          },
        }
      }
    } else {
      sessionParams.mode = 'payment'
      sessionParams.line_items = [{ price: priceId, quantity: 1 }]
      sessionParams.invoice_creation = {
        enabled: true,
        invoice_data: {
          description: '10er Karte – 6 Monate gültig',
          metadata: {
            subscription_id: subscriptionId,
            membership_id: membershipId,
          },
        },
      }
      sessionParams.payment_intent_data = {
        metadata: {
          subscription_id: subscriptionId,
          membership_id: membershipId,
        },
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)
    const checkoutUrl = session.url

    // Update subscription with new checkout session ID
    await supabaseAdmin
      .from('subscriptions')
      .update({
        stripe_checkout_session_id: session.id,
        stripe_customer_id: customerId,
      })
      .eq('id', subscriptionId)

    // Send reminder email via Resend
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const EMAIL_FROM = process.env.EMAIL_FROM || 'Salim Lee Gym <noreply@salimlee-gym.de>'

    const { error: emailError } = await resend.emails.send({
      from: EMAIL_FROM,
      to: memberEmail,
      subject: 'Zahlungserinnerung – Salim Lee Gym',
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; background-color: #09090b; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #18181b; border-radius: 16px; overflow: hidden; border: 1px solid rgba(176,0,0,0.3);">
            <div style="background: linear-gradient(to right, #b00000, #900000); padding: 30px; text-align: center;">
              <div style="font-size: 32px; font-weight: 900; color: #ffffff; margin-bottom: 5px;">SALIM LEE</div>
              <div style="color: #ffffff; letter-spacing: 3px; font-size: 12px; opacity: 0.9;">BOXING & FITNESS GYM</div>
            </div>
            <div style="padding: 40px 30px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 64px; height: 64px; background: #ffa50020; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 28px;">⚠</span>
                </div>
                <h2 style="color: #ffa500; margin: 0 0 10px; font-size: 24px;">Zahlungserinnerung</h2>
              </div>
              <p style="color: #a1a1aa; line-height: 1.8; margin: 0 0 25px;">
                Hallo <strong style="color: #fafafa;">${memberName}</strong>,<br><br>
                wir möchten dich freundlich daran erinnern, dass die Zahlung für dein Abonnement
                <strong style="color: #fafafa;">${subscriptionName}</strong> noch aussteht.
                Bitte schließe deine Zahlung über den Button unten ab, um deine Mitgliedschaft zu aktivieren.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${checkoutUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(to right, #b00000, #900000); color: #ffffff; font-weight: bold; font-size: 16px; text-decoration: none; border-radius: 8px;">
                  Jetzt bezahlen
                </a>
                <p style="color: #71717a; font-size: 12px; margin-top: 12px;">
                  Klicke auf den Button, um deine Zahlung sicher über Stripe abzuschließen.
                </p>
              </div>
              <p style="color: #a1a1aa; line-height: 1.8;">
                Bei Fragen erreichst du uns jederzeit unter
                <a href="mailto:info@salimlee-gym.de" style="color: #b00000;">info@salimlee-gym.de</a>
                oder telefonisch unter <strong style="color: #fafafa;">+49 151 68457943</strong>.
              </p>
              <p style="color: #a1a1aa; margin-top: 30px; line-height: 1.8;">
                Sportliche Grüße,<br>
                <strong style="color: #b00000;">Dein Salim Lee Team</strong>
              </p>
            </div>
            <div style="background-color: #09090b; padding: 20px; text-align: center; color: #71717a; font-size: 12px;">
              Wörthstrasse 17, 72764 Reutlingen<br>
              &copy; ${new Date().getFullYear()} Salim Lee Boxing & Fitness Gym
            </div>
          </div>
        </body>
        </html>
      `,
    })

    if (emailError) {
      console.error('Zahlungserinnerung fehlgeschlagen:', emailError)
      return NextResponse.json({ error: `E-Mail fehlgeschlagen: ${emailError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Zahlungserinnerung fehlgeschlagen:', error)
    return NextResponse.json({ error: 'Zahlungserinnerung konnte nicht gesendet werden' }, { status: 500 })
  }
}
