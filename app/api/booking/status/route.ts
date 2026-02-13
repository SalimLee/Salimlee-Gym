import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createServerSupabaseClient()


    // Auth prüfen
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { bookingId, status: newStatus } = await request.json()

    if (!bookingId || !newStatus) {
      return NextResponse.json({ error: 'bookingId und status erforderlich' }, { status: 400 })
    }

    const validStatuses = ['pending', 'confirmed', 'cancelled'] as const
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({ error: 'Ungültiger Status' }, { status: 400 })
    }

    const typedStatus = newStatus as 'pending' | 'confirmed' | 'cancelled'

    // Buchung laden (für Email-Daten)
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Buchung nicht gefunden' }, { status: 404 })
    }
    // Status aktualisieren
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: typedStatus })
      .eq('id', bookingId)


    if (updateError) {
      return NextResponse.json({ error: 'Status konnte nicht aktualisiert werden' }, { status: 500 })
    }

    // E-Mail senden (wenn Resend konfiguriert und Status relevant)
    if (process.env.RESEND_API_KEY && (typedStatus === 'confirmed' || typedStatus === 'cancelled')) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)

        const formattedDate = booking.preferred_date
          ? new Date(booking.preferred_date).toLocaleDateString('de-DE', {
              weekday: 'long',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })
          : 'Nicht angegeben'

        if (typedStatus === 'confirmed') {
          await resend.emails.send({
            from: 'Salim Lee Gym <onboarding@resend.dev>',
            to: booking.email,
            subject: 'Deine Buchung wurde bestätigt! - Salim Lee Gym',
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
                    <div style="text-align: center; margin-bottom: 30px;">
                      <div style="width: 64px; height: 64px; background: #22c55e20; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                        <span style="font-size: 32px;">&#10003;</span>
                      </div>
                      <h2 style="color: #22c55e; margin: 0 0 10px; font-size: 24px;">Buchung bestätigt!</h2>
                    </div>
                    <p style="color: #a1a1aa; line-height: 1.8; margin: 0 0 25px;">Hallo <strong style="color: #fafafa;">${booking.name}</strong>,<br><br>
                    Großartige Neuigkeiten! Deine Buchungsanfrage wurde <strong style="color: #22c55e;">bestätigt</strong>. Wir freuen uns auf dich!</p>
                    <div style="background-color: #27272a; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #22c55e;">
                      <h3 style="color: #22c55e; margin: 0 0 15px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Deine bestätigte Buchung</h3>
                      <p style="color: #fafafa; margin: 8px 0;"><strong>Service:</strong> ${booking.service}</p>
                      <p style="color: #fafafa; margin: 8px 0;"><strong>Personen:</strong> ${booking.people}</p>
                      <p style="color: #fafafa; margin: 8px 0;"><strong>Termin:</strong> ${formattedDate}</p>
                    </div>
                    <p style="color: #a1a1aa; line-height: 1.8;">Bei Fragen erreichst du uns jederzeit unter <a href="mailto:info@salim-lee-gym.de" style="color: #f59e0b;">info@salim-lee-gym.de</a></p>
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
        } else if (typedStatus === 'cancelled') {
          await resend.emails.send({
            from: 'Salim Lee Gym <onboarding@resend.dev>',
            to: booking.email,
            subject: 'Deine Buchungsanfrage - Salim Lee Gym',
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
                    <p style="color: #a1a1aa; line-height: 1.8; margin: 0 0 25px;">Hallo <strong style="color: #fafafa;">${booking.name}</strong>,<br><br>
                    Leider müssen wir dir mitteilen, dass deine Buchungsanfrage für <strong style="color: #f59e0b;">${booking.service}</strong> am <strong style="color: #fafafa;">${formattedDate}</strong> leider nicht wahrgenommen werden kann.</p>
                    <p style="color: #a1a1aa; line-height: 1.8;">Gerne kannst du eine neue Anfrage stellen oder uns direkt kontaktieren, damit wir einen passenden Termin für dich finden.</p>
                    <div style="margin-top: 30px; text-align: center;">
                      <a href="https://salim-lee-gym.de" style="display: inline-block; padding: 14px 28px; background: linear-gradient(to right, #f59e0b, #d97706); color: #18181b; text-decoration: none; border-radius: 8px; font-weight: bold;">Neue Anfrage stellen</a>
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
        }
      } catch (emailError) {
        console.error('Status-Email fehlgeschlagen:', emailError)
      }
    }

    return NextResponse.json({ success: true, status: typedStatus })
  } catch (error) {
    console.error('Status-Update Fehler:', error)
    return NextResponse.json({ error: 'Ein Fehler ist aufgetreten' }, { status: 500 })
  }
}
