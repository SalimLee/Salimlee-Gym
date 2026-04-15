import { NextRequest, NextResponse } from 'next/server'
import { requireAdminClient } from '@/lib/admin-auth'
import { syncStripeInvoices } from '@/lib/stripe-invoice-sync'

export async function POST(request: NextRequest) {
  const auth = await requireAdminClient(request)
  if (!auth.ok) return auth.response

  try {
    const result = await syncStripeInvoices(90) // 90 Tage bei manuellem Sync
    return NextResponse.json(result)
  } catch (error) {
    console.error('Manueller Stripe Sync fehlgeschlagen:', error)
    return NextResponse.json({ error: 'Sync fehlgeschlagen' }, { status: 500 })
  }
}
