import { NextRequest, NextResponse } from 'next/server'
import { syncStripeInvoices } from '@/lib/stripe-invoice-sync'

export async function GET(request: NextRequest) {
  // Vercel Cron Auth
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await syncStripeInvoices(30)
    console.log('Stripe Invoice Sync (Cron):', result)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Cron Sync fehlgeschlagen:', error)
    return NextResponse.json({ error: 'Sync fehlgeschlagen' }, { status: 500 })
  }
}
