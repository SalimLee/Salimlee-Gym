import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * Erzeugt einen "Zahlungsmethode aktualisieren"-Link (Stripe Checkout im mode: 'setup')
 * und schickt ihn optional per Mail an das Mitglied.
 *
 * WARUM DAS WICHTIG IST: Bisher wurde bei Zahlungsproblemen ein NEUER Checkout-Link
 * verschickt — der legt in Stripe ein ZWEITES Abo an. Ergebnis: doppelte Rechnungen
 * und mehrfache Abbuchungen pro Monat (genau dieser Fehler ist real aufgetreten).
 * Dieser Link legt KEIN Abo an: der Kunde erteilt nur ein neues SEPA-Mandat, und der
 * Webhook (checkout.session.completed, mode 'setup') setzt es als Standard am
 * BESTEHENDEN Abo + am Kunden.
 *
 * Body: { subscriptionId, memberEmail?, memberName?, sendMail? }
 */
export async function POST(request: NextRequest) {
  try {
    const { subscriptionId, memberEmail, memberName, sendMail } = await request.json()
    if (!subscriptionId) {
      return NextResponse.json({ error: 'subscriptionId ist erforderlich' }, { status: 400 })
    }

    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('id, name, member_id, stripe_subscription_id, stripe_customer_id')
      .eq('id', subscriptionId)
      .maybeSingle()

    if (!sub) {
      return NextResponse.json({ error: 'Abo nicht gefunden' }, { status: 404 })
    }

    // Kunden-ID ermitteln: bevorzugt lokal, sonst über das Stripe-Abo auflösen.
    let customerId: string | null = sub.stripe_customer_id ?? null
    if (!customerId && sub.stripe_subscription_id) {
      const s = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
      customerId = typeof s.customer === 'string' ? s.customer : s.customer.id
    }
    if (!customerId) {
      return NextResponse.json(
        { error: 'Kein Stripe-Kunde verknüpft — das Mitglied hat noch nie über Stripe bezahlt.' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.salimlee-gym.de'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'setup',
      locale: 'de',
      currency: 'eur',
      payment_method_types: ['sepa_debit'],
      success_url: `${baseUrl}/zahlung-erfolgreich?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/zahlung-abgebrochen`,
      metadata: {
        subscription_id: subscriptionId,
        stripe_subscription_id: sub.stripe_subscription_id || '',
        purpose: 'payment_method_update',
      },
    })

    // Optional: Link direkt per Mail an das Mitglied.
    let mailed = false
    if (sendMail && memberEmail && process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const FROM = process.env.EMAIL_FROM || 'Salim Lee Gym <noreply@salimlee-gym.de>'
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#18181b;padding:32px;border-radius:12px">
          <h2 style="color:#fff;margin:0 0 16px">Zahlungsmethode aktualisieren</h2>
          <p style="color:#d4d4d8;line-height:1.7">Hallo ${memberName || ''},</p>
          <p style="color:#d4d4d8;line-height:1.7">
            bei deiner letzten Abbuchung für <strong style="color:#fff">${sub.name}</strong> gab es ein Problem.
            Bitte hinterlege über den folgenden Link deine Bankverbindung neu — das dauert keine Minute.
          </p>
          <p style="color:#a1a1aa;line-height:1.7;font-size:14px">
            <strong style="color:#fff">Wichtig:</strong> Dabei entsteht <strong style="color:#fff">kein neuer Vertrag</strong>
            und es wird <strong style="color:#fff">nichts zusätzlich abgebucht</strong> — deine bestehende Mitgliedschaft
            läuft unverändert weiter, nur mit der aktualisierten Bankverbindung.
          </p>
          <p style="text-align:center;margin:28px 0">
            <a href="${session.url}" style="display:inline-block;padding:14px 28px;background:#b00000;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">Zahlungsmethode aktualisieren</a>
          </p>
          <p style="color:#a1a1aa;line-height:1.7;font-size:14px">
            Fragen? <a href="mailto:info@salimlee-gym.de" style="color:#b00000">info@salimlee-gym.de</a> · +49 151 68457943
          </p>
        </div>`
      const { error } = await resend.emails.send({
        from: FROM,
        to: memberEmail,
        subject: 'Bitte Zahlungsmethode aktualisieren – Salim Lee Gym',
        html,
      })
      if (error) {
        return NextResponse.json(
          { error: `Link erstellt, aber E-Mail fehlgeschlagen: ${error.message}`, url: session.url },
          { status: 500 }
        )
      }
      mailed = true
    }

    return NextResponse.json({ url: session.url, mailed })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unbekannter Fehler'
    console.error('Zahlungsmethoden-Link fehlgeschlagen:', error)
    return NextResponse.json({ error: `Zahlungsmethoden-Link: ${msg}` }, { status: 500 })
  }
}
