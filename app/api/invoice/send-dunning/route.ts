import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Resend nicht konfiguriert' }, { status: 200 })
    }

    const { memberName, memberEmail, invoiceNumber, description, amount, dueDate } = await request.json()

    if (!memberEmail || !memberName || !invoiceNumber || !amount || !dueDate) {
      return NextResponse.json({ error: 'Alle Pflichtfelder erforderlich' }, { status: 400 })
    }

    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const EMAIL_FROM = process.env.EMAIL_FROM || 'Salim Lee Gym <noreply@salimlee-gym.de>'

    const formattedAmount = Number(amount).toFixed(2)
    const formattedDate = new Date(dueDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })

    const { error: emailError } = await resend.emails.send({
      from: EMAIL_FROM,
      to: memberEmail,
      subject: `Zahlungserinnerung – Rechnung ${invoiceNumber} – Salim Lee Gym`,
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
                <div style="width: 64px; height: 64px; background: #eab30820; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 28px;">📋</span>
                </div>
                <h2 style="color: #eab308; margin: 0 0 10px; font-size: 24px;">Freundliche Zahlungserinnerung</h2>
              </div>
              <p style="color: #a1a1aa; line-height: 1.8; margin: 0 0 25px;">
                Hallo <strong style="color: #fafafa;">${memberName}</strong>,<br><br>
                wir möchten dich freundlich daran erinnern, dass die folgende Rechnung noch offen ist. Möglicherweise hat sich die Zahlung mit dieser Erinnerung bereits überschnitten — in diesem Fall kannst du diese Nachricht einfach ignorieren.
              </p>

              <div style="background-color: #27272a; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #eab308;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #71717a; font-size: 13px;">Rechnungsnr.</td>
                    <td style="padding: 8px 0; color: #fafafa; font-size: 13px; text-align: right; font-weight: bold;">${invoiceNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #71717a; font-size: 13px;">Beschreibung</td>
                    <td style="padding: 8px 0; color: #e4e4e7; font-size: 13px; text-align: right;">${description}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #71717a; font-size: 13px;">Fällig seit</td>
                    <td style="padding: 8px 0; color: #eab308; font-size: 13px; text-align: right; font-weight: bold;">${formattedDate}</td>
                  </tr>
                  <tr style="border-top: 1px solid #3f3f46;">
                    <td style="padding: 12px 0 8px; color: #71717a; font-size: 14px; font-weight: bold;">Offener Betrag</td>
                    <td style="padding: 12px 0 8px; color: #fafafa; font-size: 20px; text-align: right; font-weight: 900;">${formattedAmount} €</td>
                  </tr>
                </table>
              </div>

              <p style="color: #a1a1aa; line-height: 1.8; margin: 0 0 25px;">
                Wir bitten dich, den offenen Betrag zeitnah zu begleichen. Falls du Fragen zur Rechnung hast oder eine Ratenzahlung vereinbaren möchtest, melde dich gerne bei uns — wir finden gemeinsam eine Lösung.
              </p>

              <p style="color: #a1a1aa; line-height: 1.8;">
                Du erreichst uns jederzeit unter
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
      console.error('Mahnungs-E-Mail fehlgeschlagen:', emailError)
      return NextResponse.json({ error: `E-Mail fehlgeschlagen: ${emailError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mahnungs-E-Mail fehlgeschlagen:', error)
    return NextResponse.json({ error: 'E-Mail konnte nicht gesendet werden' }, { status: 500 })
  }
}
