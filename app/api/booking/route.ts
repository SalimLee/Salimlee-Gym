import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase Admin Client (server-side, bypasses RLS for inserts)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Email-Adresse des Gym-Besitzers
const GYM_EMAIL = process.env.GYM_EMAIL || 'info@salim-lee-gym.de'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, service, people, date, message } = body

    // Validierung
    if (!name || !email || !service) {
      return NextResponse.json(
        { error: 'Name, Email und Service sind erforderlich' },
        { status: 400 }
      )
    }

    // ========================================
    // BUCHUNG IN DATENBANK SPEICHERN
    // ========================================
    const { data: booking, error: dbError } = await supabase
      .from('bookings')
      .insert({
        name,
        email,
        phone: phone || null,
        service,
        people: parseInt(people) || 1,
        preferred_date: date || null,
        message: message || null,
        status: 'pending',
      })
      .select()
      .single()

    if (dbError) {
      console.error('Datenbank Fehler:', dbError)
      return NextResponse.json(
        { error: 'Buchung konnte nicht gespeichert werden. Bitte versuche es später erneut.' },
        { status: 500 }
      )
    }

    // ========================================
    // E-MAILS SENDEN (optional - nur wenn Resend konfiguriert)
    // ========================================
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)

        const formattedDate = date
          ? new Date(date).toLocaleDateString('de-DE', {
              weekday: 'long',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })
          : 'Nicht angegeben'

        // Email an Gym-Besitzer
        await resend.emails.send({
          from: 'Salim Lee Gym <onboarding@resend.dev>',
          to: GYM_EMAIL,
          subject: `Neue Buchungsanfrage: ${service} von ${name}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: Arial, sans-serif; background-color: #09090b; margin: 0; padding: 20px;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #18181b; border-radius: 16px; overflow: hidden; border: 1px solid #f59e0b33;">
                <div style="background: linear-gradient(to right, #f59e0b, #d97706); padding: 30px; text-align: center;">
                  <h1 style="color: #18181b; margin: 0; font-size: 28px;">NEUE BUCHUNGSANFRAGE</h1>
                </div>
                <div style="padding: 30px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 12px 0; border-bottom: 1px solid #27272a; color: #a1a1aa; width: 140px;">Name</td><td style="padding: 12px 0; border-bottom: 1px solid #27272a; color: #fafafa; font-weight: bold;">${name}</td></tr>
                    <tr><td style="padding: 12px 0; border-bottom: 1px solid #27272a; color: #a1a1aa;">Email</td><td style="padding: 12px 0; border-bottom: 1px solid #27272a; color: #fafafa;"><a href="mailto:${email}" style="color: #f59e0b;">${email}</a></td></tr>
                    <tr><td style="padding: 12px 0; border-bottom: 1px solid #27272a; color: #a1a1aa;">Telefon</td><td style="padding: 12px 0; border-bottom: 1px solid #27272a; color: #fafafa;">${phone || '-'}</td></tr>
                    <tr><td style="padding: 12px 0; border-bottom: 1px solid #27272a; color: #a1a1aa;">Service</td><td style="padding: 12px 0; border-bottom: 1px solid #27272a; color: #f59e0b; font-weight: bold;">${service}</td></tr>
                    <tr><td style="padding: 12px 0; border-bottom: 1px solid #27272a; color: #a1a1aa;">Personen</td><td style="padding: 12px 0; border-bottom: 1px solid #27272a; color: #fafafa;">${people} Person(en)</td></tr>
                    <tr><td style="padding: 12px 0; border-bottom: 1px solid #27272a; color: #a1a1aa;">Wunschtermin</td><td style="padding: 12px 0; border-bottom: 1px solid #27272a; color: #fafafa;">${formattedDate}</td></tr>
                    ${message ? `<tr><td style="padding: 12px 0; color: #a1a1aa; vertical-align: top;">Nachricht</td><td style="padding: 12px 0; color: #fafafa;">${message}</td></tr>` : ''}
                  </table>
                  <div style="margin-top: 30px; text-align: center;">
                    <a href="mailto:${email}?subject=Deine%20Buchungsanfrage%20bei%20Salim%20Lee%20Gym" style="display: inline-block; padding: 14px 28px; background: linear-gradient(to right, #f59e0b, #d97706); color: #18181b; text-decoration: none; border-radius: 8px; font-weight: bold;">Kunde antworten</a>
                  </div>
                </div>
                <div style="background-color: #09090b; padding: 20px; text-align: center; color: #71717a; font-size: 12px;">Salim Lee Boxing & Fitness Gym</div>
              </div>
            </body>
            </html>
          `,
        })

        // Bestätigungsemail an Kunden
        await resend.emails.send({
          from: 'Salim Lee Gym <onboarding@resend.dev>',
          to: email,
          subject: 'Deine Buchungsanfrage bei Salim Lee Gym',
          html: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: Arial, sans-serif; background-color: #09090b; margin: 0; padding: 20px;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #18181b; border-radius: 16px; overflow: hidden; border: 1px solid #f59e0b33;">
                <div style="background: linear-gradient(to right, #f59e0b, #d97706); padding: 30px; text-align: center;">
                  <div style="font-size: 32px; font-weight: 900; color: #18181b; margin-bottom: 5px;">SALIM LEE</div>
                  <div style="color: #18181b; letter-spacing: 3px; font-size: 12px;">BOXING & FITNESS GYM</div>
                </div>
                <div style="padding: 40px 30px;">
                  <h2 style="color: #fafafa; margin: 0 0 20px;">Hallo ${name}!</h2>
                  <p style="color: #a1a1aa; line-height: 1.8; margin: 0 0 25px;">Vielen Dank für deine Buchungsanfrage! Wir haben sie erhalten und melden uns <strong style="color: #f59e0b;">innerhalb von 24 Stunden</strong> bei dir.</p>
                  <div style="background-color: #27272a; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #f59e0b;">
                    <h3 style="color: #f59e0b; margin: 0 0 15px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Deine Anfrage</h3>
                    <p style="color: #fafafa; margin: 8px 0;"><strong>Service:</strong> ${service}</p>
                    <p style="color: #fafafa; margin: 8px 0;"><strong>Personen:</strong> ${people}</p>
                    <p style="color: #fafafa; margin: 8px 0;"><strong>Wunschtermin:</strong> ${formattedDate}</p>
                  </div>
                  <p style="color: #a1a1aa; margin-top: 30px; line-height: 1.8;">Sportliche Grüße,<br><strong style="color: #f59e0b;">Dein Salim Lee Team</strong></p>
                </div>
                <div style="background-color: #09090b; padding: 20px; text-align: center; color: #71717a; font-size: 12px;">
                  Metzgerstrasse 5, 72764 Reutlingen<br>&copy; ${new Date().getFullYear()} Salim Lee Boxing & Fitness Gym
                </div>
              </div>
            </body>
            </html>
          `,
        })
      } catch (emailError) {
        // Email-Fehler loggen, aber Buchung trotzdem als erfolgreich melden
        console.error('Email-Versand fehlgeschlagen:', emailError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Buchungsanfrage erfolgreich gesendet!',
      bookingId: booking?.id,
    })
  } catch (error) {
    console.error('Buchungsfehler:', error)
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.' },
      { status: 500 }
    )
  }
}
