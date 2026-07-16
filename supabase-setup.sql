-- ============================================
-- SALGADOS DA PATY - SUPABASE SETUP
-- ============================================

-- 1. CREATE PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  imageurl TEXT,
  price DECIMAL(10, 2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  orderbalance INTEGER DEFAULT 0,
  partner BOOLEAN DEFAULT FALSE,
  partnerurl TEXT,
  promotion BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CREATE ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customername TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  notes TEXT,
  items JSONB NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'recebido',
  scheduledat TIMESTAMP WITH TIME ZONE,
  feedback TEXT,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 4. PRODUCTS: EVERYONE CAN READ
CREATE POLICY "Allow public read" ON products
  FOR SELECT USING (true);

-- 5. PRODUCTS: ONLY ADMIN CAN INSERT/UPDATE/DELETE
-- (Will add auth check via app/middleware)
CREATE POLICY "Allow all for now" ON products
  FOR ALL USING (true);

-- 6. ORDERS: EVERYONE CAN READ
CREATE POLICY "Allow public read" ON orders
  FOR SELECT USING (true);

-- 7. ORDERS: EVERYONE CAN INSERT
CREATE POLICY "Allow insert orders" ON orders
  FOR INSERT WITH CHECK (true);

-- 8. ORDERS: ONLY ADMIN CAN UPDATE/DELETE
CREATE POLICY "Allow all for now" ON orders
  FOR UPDATE USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete for now" ON orders
  FOR DELETE USING (true);

-- 9. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
