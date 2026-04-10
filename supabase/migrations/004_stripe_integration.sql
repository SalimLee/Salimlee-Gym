-- Add 'pending' to subscription_status enum
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'pending';

-- Add Stripe tracking columns to subscriptions
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_session
  ON subscriptions(stripe_checkout_session_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription
  ON subscriptions(stripe_subscription_id);
