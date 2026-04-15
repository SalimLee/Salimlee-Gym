import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export interface MembershipConfig {
  name: string
  description: string
  unitAmount: number // in cents
  recurring: boolean
  intervalCount?: number // number of months for fixed-term
}

export const MEMBERSHIP_STRIPE_MAP: Record<string, MembershipConfig> = {
  erwachsene_6: {
    name: 'Erwachsene & Jugendliche – 6 Monate',
    description: '90 €/Monat, 6 Monate Laufzeit',
    unitAmount: 9000,
    recurring: true,
    intervalCount: 6,
  },
  erwachsene_12: {
    name: 'Erwachsene & Jugendliche – 12 Monate',
    description: '80 €/Monat, 12 Monate Laufzeit',
    unitAmount: 8000,
    recurring: true,
    intervalCount: 12,
  },
  kinder_12: {
    name: 'Kinder (3–14 Jahre) – 12 Monate',
    description: '50 €/Monat, 12 Monate Laufzeit',
    unitAmount: 5000,
    recurring: true,
    intervalCount: 12,
  },
  monatlich: {
    name: 'Monatlich kündbar',
    description: '120 €/Monat, monatlich kündbar',
    unitAmount: 12000,
    recurring: true,
  },
  schueler_6: {
    name: 'Schüler / Azubi / Student – 6 Monate',
    description: '55 €/Monat, 6 Monate Laufzeit (nur mit Nachweis ab 14 Jahren)',
    unitAmount: 5500,
    recurring: true,
    intervalCount: 6,
  },
  schueler_monatlich: {
    name: 'Schüler / Azubi / Student – Monatlich kündbar',
    description: '80 €/Monat, monatlich kündbar (nur mit Nachweis ab 14 Jahren)',
    unitAmount: 8000,
    recurring: true,
  },
  '10er_karte': {
    name: '10er Karte – 6 Monate gültig',
    description: '160 € Einmalzahlung',
    unitAmount: 16000,
    recurring: false,
  },
}

// Servicepauschale: €40 alle 6 Monate, wird automatisch auf die Rechnung draufgepackt
export const SERVICE_FEE = {
  name: 'Servicepauschale',
  description: 'Halbjährliche Servicepauschale',
  unitAmount: 4000, // 40€ in Cent
  intervalMonths: 6,
}

/**
 * Finds or creates the Servicepauschale product in Stripe.
 * Returns the product ID (not a price — we use invoice items).
 */
export async function getOrCreateServiceFeeProduct(): Promise<string> {
  const existing = await stripe.products.search({
    query: `metadata['type']:'service_fee'`,
  })

  if (existing.data.length > 0) {
    return existing.data[0].id
  }

  const product = await stripe.products.create({
    name: SERVICE_FEE.name,
    description: SERVICE_FEE.description,
    metadata: { type: 'service_fee' },
  })

  return product.id
}

/**
 * Finds or creates the 19% MwSt tax rate in Stripe.
 */
export async function getOrCreateTaxRate(): Promise<string> {
  const existing = await stripe.taxRates.list({ active: true, limit: 100 })
  const mwst = existing.data.find(
    t => t.percentage === 19 && t.inclusive === true && t.country === 'DE'
  )
  if (mwst) return mwst.id

  const taxRate = await stripe.taxRates.create({
    display_name: 'MwSt',
    description: 'Mehrwertsteuer 19%',
    percentage: 19,
    inclusive: true, // Preise sind bereits inkl. MwSt
    country: 'DE',
    jurisdiction: 'DE',
  })
  return taxRate.id
}

/**
 * Finds or creates a Stripe Product + Price for a given membership ID.
 * Uses metadata to identify existing products.
 */
export async function getOrCreateStripePrice(membershipId: string): Promise<string> {
  const config = MEMBERSHIP_STRIPE_MAP[membershipId]
  if (!config) {
    throw new Error(`Unknown membership ID: ${membershipId}`)
  }

  // Search for existing product by metadata
  const existingProducts = await stripe.products.search({
    query: `metadata['membership_id']:'${membershipId}'`,
  })

  let productId: string

  if (existingProducts.data.length > 0) {
    productId = existingProducts.data[0].id

    // Check if there's already an active price
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 1,
    })

    if (prices.data.length > 0) {
      return prices.data[0].id
    }
  } else {
    // Create new product
    const product = await stripe.products.create({
      name: config.name,
      description: config.description,
      metadata: { membership_id: membershipId },
    })
    productId = product.id
  }

  // Create price
  const priceData: Stripe.PriceCreateParams = {
    product: productId,
    unit_amount: config.unitAmount,
    currency: 'eur',
  }

  if (config.recurring) {
    priceData.recurring = { interval: 'month' }
  }

  const price = await stripe.prices.create(priceData)
  return price.id
}

/**
 * Finds or creates a Stripe Customer by email.
 */
export async function getOrCreateStripeCustomer(
  email: string,
  name: string
): Promise<string> {
  const existing = await stripe.customers.list({
    email,
    limit: 1,
  })

  if (existing.data.length > 0) {
    return existing.data[0].id
  }

  const customer = await stripe.customers.create({
    email,
    name,
  })

  return customer.id
}
