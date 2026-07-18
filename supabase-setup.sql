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

-- 4. DROP EXISTING OPEN POLICIES (if any)
DROP POLICY IF EXISTS "Allow public read" ON products;
DROP POLICY IF EXISTS "Allow all for now" ON products;
DROP POLICY IF EXISTS "Allow insert orders" ON orders;
DROP POLICY IF EXISTS "Allow public read" ON orders;
DROP POLICY IF EXISTS "Allow all for now" ON orders;
DROP POLICY IF EXISTS "Allow delete for now" ON orders;

-- 5. PRODUCTS: PUBLIC READ FOR THE STOREFRONT, AUTHENTICATED WRITES FOR ADMIN
CREATE POLICY "Products: allow public read" ON products
  FOR SELECT USING (true);

CREATE POLICY "Products: allow authenticated write" ON products
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Products: allow authenticated update" ON products
  FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Products: allow authenticated delete" ON products
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- 6. ORDERS: NO PUBLIC ACCESS BY DEFAULT
CREATE POLICY "Orders: deny anonymous read" ON orders
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Orders: deny anonymous insert" ON orders
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Orders: deny anonymous update" ON orders
  FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Orders: deny anonymous delete" ON orders
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- 9. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
