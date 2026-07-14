-- Add ordercode column to orders table for customer tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ordercode VARCHAR(6) DEFAULT '';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_ordercode ON orders(ordercode);
CREATE INDEX IF NOT EXISTS idx_orders_whatsapp_ordercode ON orders(whatsapp, ordercode);
