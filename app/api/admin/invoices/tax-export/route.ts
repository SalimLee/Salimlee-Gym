import { NextRequest, NextResponse } from 'next/server'
import { requireAdminClient } from '@/lib/admin-auth'
import { stripe } from '@/lib/stripe'
import { renderToBuffer } from '@react-pdf/renderer'
import { InvoicePDFDocument } from '@/lib/invoice-pdf-template'
import JSZip from 'jszip'
import React from 'react'

export const maxDuration = 300 // 5 Minuten Timeout

export async function POST(request: NextRequest) {
  const auth = await requireAdminClient(request)
  if (!auth.ok) return auth.response

  try {
    const { from, to } = await request.json()
    if (!from || !to) {
      return NextResponse.json({ error: 'Zeitraum (from, to) erforderlich' }, { status: 400 })
    }

    // Lade alle Rechnungen im Zeitraum mit Member-Namen
    const { data: invoices, error } = await auth.admin
      .from('invoices')
      .select('*, members(name, email)')
      .gte('due_date', from)
      .lte('due_date', to)
      .order('due_date', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Rechnungen konnten nicht geladen werden' }, { status: 500 })
    }

    if (!invoices || invoices.length === 0) {
      return NextResponse.json({ error: 'Keine Rechnungen im gewählten Zeitraum' }, { status: 404 })
    }

    const zip = new JSZip()

    // CSV Zusammenfassung
    const csvHeader = 'Rechnungsnr;Datum;Mitglied;Beschreibung;Betrag;Status;Quelle\n'
    const csvRows = invoices.map((inv: Record<string, unknown>) => {
      const member = inv.members as { name: string; email: string } | null
      const memberName = member?.name || 'Unbekannt'
      const status = inv.status as string
      const source = (inv.source as string) || 'manual'
      const statusDE: Record<string, string> = { paid: 'Bezahlt', open: 'Offen', overdue: 'Überfällig', cancelled: 'Storniert' }
      return `${inv.invoice_number};${inv.due_date};${memberName};${(inv.description as string).replace(/;/g, ',')};${Number(inv.amount).toFixed(2)};${statusDE[status] || status};${source === 'stripe' ? 'Stripe' : 'Manuell'}`
    }).join('\n')
    zip.file(`Zusammenfassung_${from}_bis_${to}.csv`, '\uFEFF' + csvHeader + csvRows) // BOM for Excel

    // PDFs generieren
    for (const inv of invoices) {
      const member = (inv as Record<string, unknown>).members as { name: string; email: string } | null
      const memberName = member?.name || 'Unbekannt'
      const source = ((inv as Record<string, unknown>).source as string) || 'manual'
      const invoiceNumber = (inv as Record<string, unknown>).invoice_number as string
      const safeFilename = invoiceNumber.replace(/[^a-zA-Z0-9\-_]/g, '_')

      if (source === 'stripe' && (inv as Record<string, unknown>).stripe_invoice_id) {
        // Stripe: Frische PDF-URL holen und runterladen
        try {
          const stripeInv = await stripe.invoices.retrieve((inv as Record<string, unknown>).stripe_invoice_id as string)
          if (stripeInv.invoice_pdf) {
            const pdfRes = await fetch(stripeInv.invoice_pdf)
            if (pdfRes.ok) {
              const pdfBuffer = await pdfRes.arrayBuffer()
              zip.file(`${safeFilename}.pdf`, pdfBuffer)
              continue
            }
          }
        } catch (e) {
          console.warn(`Stripe PDF für ${invoiceNumber} fehlgeschlagen:`, e)
        }
      }

      // Manuell oder Stripe-Fallback: PDF generieren
      try {
        const doc = React.createElement(InvoicePDFDocument, {
          invoiceNumber,
          memberName,
          description: (inv as Record<string, unknown>).description as string,
          amount: Number((inv as Record<string, unknown>).amount),
          dueDate: (inv as Record<string, unknown>).due_date as string,
          paidDate: (inv as Record<string, unknown>).paid_date as string | null,
          status: (inv as Record<string, unknown>).status as string,
          createdAt: (inv as Record<string, unknown>).created_at as string,
          notes: (inv as Record<string, unknown>).notes as string | null,
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfBuffer = await renderToBuffer(doc as any)
        zip.file(`${safeFilename}.pdf`, pdfBuffer)
      } catch (e) {
        console.warn(`PDF-Generierung für ${invoiceNumber} fehlgeschlagen:`, e)
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

    return new NextResponse(zipBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="Steuer-Export_${from}_bis_${to}.zip"`,
      },
    })
  } catch (error) {
    console.error('Tax Export fehlgeschlagen:', error)
    return NextResponse.json({ error: 'Export fehlgeschlagen' }, { status: 500 })
  }
}
