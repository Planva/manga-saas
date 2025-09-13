-- drizzle/0012_add_stripe_customer_map.sql
CREATE TABLE IF NOT EXISTS stripe_customer_map (
  customerId TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stripe_customer_map_userId ON stripe_customer_map(userId);
