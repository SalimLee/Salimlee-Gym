import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Resend nicht konfiguriert' }, { status: 200 })
    }

    const { status, memberName, memberEmail, subscriptionName, effectiveDate, personalMessage } = await request.json()

    if (!status || !memberEmail || !memberName) {
      return NextResponse.json({ error: 'Status, Name und E-Mail erforderlich' }, { status: 400 })
    }

    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const EMAIL_FROM = process.env.EMAIL_FROM || 'Salim Lee Gym <noreply@salimlee-gym.de>'

    const statusConfig: Record<string, { subject: string; title: string; color: string; icon: string; text: string }> = {
      paused: {
        subject: 'Dein Abo wurde pausiert – Salim Lee Gym',
        title: 'Abo pausiert',
        color: '#eab308',
        icon: '⏸',
        text: `dein Abonnement <strong style="color: #fafafa;">${subscriptionName}</strong> wurde pausiert. Während der Pause werden keine Beiträge abgebucht. Du kannst jederzeit wieder einsteigen!`,
      },
      active: {
        subject: 'Dein Abo wurde fortgesetzt – Salim Lee Gym',
        title: 'Abo fortgesetzt',
        color: '#22c55e',
        icon: '▶',
        text: `dein Abonnement <strong style="color: #fafafa;">${subscriptionName}</strong> wurde wieder aktiviert. Wir freuen uns, dass du wieder dabei bist!`,
      },
      cancelled: {
        subject: 'Kündigungsbestätigung – Salim Lee Gym',
        title: 'Kündigung bestätigt',
        color: '#ef4444',
        icon: '✕',
        text: `deine Kündigung für <strong style="color: #fafafa;">${subscriptionName}</strong> wurde bestätigt.${effectiveDate ? ` Die Kündigung wird zum <strong style="color: #fafafa;">${effectiveDate}</strong> wirksam. Bis dahin kannst du dein Abo weiterhin nutzen.` : ''}`,
      },
    }

    const config = statusConfig[status]
    if (!config) {
      return NextResponse.json({ error: 'Ungültiger Status' }, { status: 400 })
    }

    const { error: emailError } = await resend.emails.send({
      from: EMAIL_FROM,
      to: memberEmail,
      subject: config.subject,
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
                <div style="width: 64px; height: 64px; background: ${config.color}20; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 28px;">${config.icon}</span>
                </div>
                <h2 style="color: ${config.color}; margin: 0 0 10px; font-size: 24px;">${config.title}</h2>
              </div>
              <p style="color: #a1a1aa; line-height: 1.8; margin: 0 0 25px;">
                Hallo <strong style="color: #fafafa;">${memberName}</strong>,<br><br>
                ${config.text}
              </p>
              ${personalMessage ? `
              <div style="background-color: #27272a; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #b00000;">
                <h3 style="color: #b00000; margin: 0 0 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Nachricht vom Team</h3>
                <p style="color: #e4e4e7; line-height: 1.8; margin: 0; white-space: pre-line;">${(personalMessage as string).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
              </div>
              ` : ''}
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
      console.error('Abo-Benachrichtigung fehlgeschlagen:', emailError)
      return NextResponse.json({ error: `E-Mail fehlgeschlagen: ${emailError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Abo-Benachrichtigung fehlgeschlagen:', error)
    return NextResponse.json({ error: 'E-Mail konnte nicht gesendet werden' }, { status: 500 })
  }
}
