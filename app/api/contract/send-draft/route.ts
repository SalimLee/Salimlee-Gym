import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'E-Mail-Versand nicht konfiguriert (RESEND_API_KEY fehlt)' },
        { status: 500 }
      )
    }

    const { pdfBase64, memberEmail, memberName } = await request.json()

    if (!pdfBase64 || !memberEmail || !memberName) {
      return NextResponse.json(
        { error: 'PDF, E-Mail und Name sind erforderlich' },
        { status: 400 }
      )
    }

    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const EMAIL_FROM = process.env.EMAIL_FROM || 'Salim Lee Gym <noreply@salimlee-gym.de>'

    const pdfBuffer = Buffer.from(pdfBase64, 'base64')
    const fileName = `Vertragsentwurf_${memberName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`

    const { error: emailError } = await resend.emails.send({
      from: EMAIL_FROM,
      to: memberEmail,
      subject: 'Dein Vertragsentwurf – Salim Lee Boxing & Fitness Gym',
      attachments: [
        {
          filename: fileName,
          content: pdfBuffer,
        },
      ],
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
                <h2 style="color: #ffffff; margin: 0 0 10px; font-size: 22px;">Dein Vertragsentwurf</h2>
              </div>
              <p style="color: #a1a1aa; line-height: 1.8; margin: 0 0 25px;">
                Hallo <strong style="color: #fafafa;">${memberName}</strong>,<br><br>
                vielen Dank für dein Interesse an <strong style="color: #b00000;">Salim Lee Boxing & Fitness Gym</strong>!
                Im Anhang findest du deinen Vertragsentwurf als PDF zum Durchlesen.
              </p>
              <div style="background-color: #27272a; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #b00000;">
                <h3 style="color: #b00000; margin: 0 0 15px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Hinweis</h3>
                <p style="color: #a1a1aa; margin: 0; line-height: 1.8;">
                  Dies ist ein <strong style="color: #fafafa;">Entwurf</strong> zur Durchsicht. Der Vertrag ist noch nicht gültig – die Unterschrift erfolgt vor Ort oder digital im nächsten Schritt.
                </p>
              </div>
              <p style="color: #a1a1aa; line-height: 1.8;">
                Bei Fragen erreichst du uns jederzeit unter
                <a href="mailto:info@salimlee-gym.de" style="color: #b00000;">info@salimlee-gym.de</a>
                oder telefonisch unter <strong style="color: #fafafa;">+49 151 68457943</strong>.
              </p>
              <p style="color: #a1a1aa; margin-top: 30px; line-height: 1.8;">
                Wir freuen uns auf dich!<br>
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
      console.error('Vertragsentwurf E-Mail fehlgeschlagen:', emailError)
      return NextResponse.json(
        { error: `E-Mail fehlgeschlagen: ${emailError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Vertragsentwurf-Versand fehlgeschlagen:', error)
    return NextResponse.json(
      { error: 'Vertragsentwurf konnte nicht versendet werden' },
      { status: 500 }
    )
  }
}
