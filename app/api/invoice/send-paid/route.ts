import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { InvoicePDFDocument } from '@/lib/invoice-pdf-template'
import React from 'react'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Resend nicht konfiguriert' }, { status: 200 })
    }

    const { memberName, memberEmail, invoiceNumber, description, amount, dueDate, paidDate, createdAt, notes } = await request.json()

    if (!memberEmail || !memberName || !invoiceNumber || !amount) {
      return NextResponse.json({ error: 'Alle Pflichtfelder erforderlich' }, { status: 400 })
    }

    // PDF generieren
    const doc = React.createElement(InvoicePDFDocument, {
      invoiceNumber,
      memberName,
      description,
      amount: Number(amount),
      dueDate,
      paidDate,
      status: 'paid',
      createdAt: createdAt || new Date().toISOString(),
      notes: notes || null,
      source: 'manual' as const,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(doc as any)

    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const EMAIL_FROM = process.env.EMAIL_FROM || 'Salim Lee Gym <noreply@salimlee-gym.de>'

    const formattedAmount = Number(amount).toFixed(2)

    const { error: emailError } = await resend.emails.send({
      from: EMAIL_FROM,
      to: memberEmail,
      subject: `Zahlungsbestätigung – Rechnung ${invoiceNumber} – Salim Lee Gym`,
      attachments: [
        {
          filename: `${invoiceNumber}.pdf`,
          content: Buffer.from(pdfBuffer),
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
                <div style="width: 64px; height: 64px; background: #22c55e20; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 28px;">✓</span>
                </div>
                <h2 style="color: #22c55e; margin: 0 0 10px; font-size: 24px;">Zahlung erhalten</h2>
              </div>
              <p style="color: #a1a1aa; line-height: 1.8; margin: 0 0 25px;">
                Hallo <strong style="color: #fafafa;">${memberName}</strong>,<br><br>
                vielen Dank! Wir bestätigen den Eingang deiner Zahlung für die Rechnung <strong style="color: #fafafa;">${invoiceNumber}</strong> über <strong style="color: #22c55e;">${formattedAmount} €</strong>.
              </p>

              <p style="color: #a1a1aa; line-height: 1.6; margin: 0 0 15px; font-size: 13px;">
                📎 Deine Rechnung findest du als PDF im Anhang dieser E-Mail.
              </p>

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
      console.error('Zahlungsbestätigung fehlgeschlagen:', emailError)
      return NextResponse.json({ error: `E-Mail fehlgeschlagen: ${emailError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Zahlungsbestätigung fehlgeschlagen:', error)
    return NextResponse.json({ error: 'E-Mail konnte nicht gesendet werden' }, { status: 500 })
  }
}
