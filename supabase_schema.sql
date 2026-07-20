-- =========================================================================
--                     JAREEB SAAS PLATFORM (COMMERCIAL LAUNCH)
--                 OFFICIAL PRODUCTION POSTGRESQL SCHEMA FOR SUPABASE
-- =========================================================================
-- Author: Senior Database Administrator & Backend Architect
-- Target Platform: Supabase / PostgreSQL (15+)
-- Environment: Production (High-Concurrency, Multi-Tenant Architecture)
-- =========================================================================

-- Enable uuid-ossp extension for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. STORES TABLE
-- =========================================================================
-- Represents individual digital storefronts managed by merchant users.
-- Links seamlessly with Supabase Auth schema (`auth.users`).

CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL, -- References auth.users from Supabase Auth
    store_name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    is_closed BOOLEAN NOT NULL DEFAULT false,
    closure_message TEXT DEFAULT 'المحل مغلق حالياً، نسعد بخدمتكم في وقت لاحق.',
    ai_credits INTEGER DEFAULT 10 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    
    -- Safety Constraints
    CONSTRAINT check_positive_credits CHECK (ai_credits >= 0),
    CONSTRAINT store_name_length_check CHECK (length(trim(store_name)) >= 2)
);

-- Comments for Schema Documentation
COMMENT ON TABLE stores IS 'Stores profile for each merchant registered in Jareeb platform.';
COMMENT ON COLUMN stores.merchant_id IS 'Corresponds to the auth.users table inside Supabase Auth.';
COMMENT ON COLUMN stores.ai_credits IS 'Remaining quota for AI features such as image description enhancement.';


-- =========================================================================
-- 2. PRODUCTS TABLE
-- =========================================================================
-- Core items offered by stores. Supports standard pricing as well as 
-- customized products like specialty custom cakes.

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    price NUMERIC(10, 2) NOT NULL,
    is_custom_cake BOOLEAN NOT NULL DEFAULT false,
    price_per_kg NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Foreign Keys & Cascades
    CONSTRAINT fk_products_store FOREIGN KEY (store_id) 
        REFERENCES stores(id) ON DELETE CASCADE,

    -- Financial & Operational Constraints
    CONSTRAINT check_positive_price CHECK (price >= 0.00),
    CONSTRAINT check_positive_price_per_kg CHECK (price_per_kg IS NULL OR price_per_kg >= 0.00),
    CONSTRAINT name_length_check CHECK (length(trim(name)) >= 2)
);

COMMENT ON TABLE products IS 'Menu items and products created and customized by store merchants.';


-- =========================================================================
-- 3. ORDERS TABLE
-- =========================================================================
-- Stores transaction data. Implements high-performance JSONB matching for 
-- dynamic, customized orders like custom cakes specifications.

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    cake_specs JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Foreign Keys
    CONSTRAINT fk_orders_store FOREIGN KEY (store_id) 
        REFERENCES stores(id) ON DELETE CASCADE,

    -- Quality Control Constraints
    CONSTRAINT check_positive_total CHECK (total_price >= 0.00),
    CONSTRAINT check_valid_status CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled'))
);

COMMENT ON TABLE orders IS 'Customer orders received by storefronts.';


-- =========================================================================
-- 4. ENTERPRISE PERFORMANCE INDEXING
-- =========================================================================
-- Indexing strategically implemented to solve Slow-Queries issues under load,
-- optimizing common JOIN pipelines, multi-tenant reads, and real-time triggers.

-- Faster tenant lookup for dashboard sessions
CREATE INDEX IF NOT EXISTS idx_stores_merchant_id ON stores(merchant_id);

-- Speed up menu listings for customer storefront visits
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);

-- Real-time subscription & transaction monitoring for merchant panels
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at_desc ON orders(created_at DESC);

-- Fast JSONB searching for analytics or customized cakes filters
CREATE INDEX IF NOT EXISTS idx_orders_cake_specs_gin ON orders USING GIN (cake_specs);


-- =========================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
-- Enforces extreme multi-tenant isolation, ensuring data privacy and integrity.

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- --------------------- STORES POLICIES ---------------------
-- Anyone (guests and buyers) must be able to view store details to place orders
CREATE POLICY "Public Read Access for Stores" ON stores
    FOR SELECT USING (true);

-- Only authenticated merchants can insert their own store
CREATE POLICY "Merchants Can Create Store Profile" ON stores
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = merchant_id);

-- Only store owners can update their store metadata
CREATE POLICY "Merchants Can Update Store Profile" ON stores
    FOR UPDATE TO authenticated 
    USING (auth.uid() = merchant_id)
    WITH CHECK (auth.uid() = merchant_id);


-- -------------------- PRODUCTS POLICIES --------------------
-- All customers must be able to browse menu products
CREATE POLICY "Public Read Access for Products" ON products
    FOR SELECT USING (true);

-- Store owners have full CRUD privileges over products in their own stores
CREATE POLICY "Store Owners Full Management of Products" ON products
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM stores 
            WHERE stores.id = products.store_id 
            AND stores.merchant_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM stores 
            WHERE stores.id = products.store_id 
            AND stores.merchant_id = auth.uid()
        )
    );


-- --------------------- ORDERS POLICIES ---------------------
-- Store owners can monitor incoming orders for their respective stores
CREATE POLICY "Store Owners Can Read Received Orders" ON orders
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM stores 
            WHERE stores.id = orders.store_id 
            AND stores.merchant_id = auth.uid()
        )
    );

-- Unauthenticated or authenticated users can place/insert orders on the storefront
CREATE POLICY "Allow Public Customers to Insert Orders" ON orders
    FOR INSERT 
    WITH CHECK (true);

-- Store owners can manage order states (e.g. status tracking)
CREATE POLICY "Store Owners Can Update Order Status" ON orders
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM stores 
            WHERE stores.id = orders.store_id 
            AND stores.merchant_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM stores 
            WHERE stores.id = orders.store_id 
            AND stores.merchant_id = auth.uid()
        )
    );


-- =========================================================================
-- 6. THREAD-SAFE TRANSACTION ATOMICS (AI CREDITS)
-- =========================================================================
-- Thread-safe, transactionally locked function to prevent credit fraud
-- or race condition exploits (e.g., balance bypassing).

CREATE OR REPLACE FUNCTION deduct_ai_credits(store_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER -- Elevate execution context securely
AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  -- 1. Fetch current credit balance and lock row for write concurrency
  SELECT ai_credits INTO current_credits
  FROM stores
  WHERE id = store_id_param
  FOR UPDATE;

  -- 2. Check if store exists
  IF current_credits IS NULL THEN
    RAISE EXCEPTION 'Store profile with ID % not found.', store_id_param;
  END IF;

  -- 3. Verify balance sufficiency
  IF current_credits <= 0 THEN
    RAISE EXCEPTION 'Insufficient AI credits remaining (Current balance: %).', current_credits;
  END IF;

  -- 4. Execute safe decrement
  UPDATE stores
  SET ai_credits = current_credits - 1
  WHERE id = store_id_param;

  -- 5. Return remaining credit balance
  RETURN current_credits - 1;
END;
$$;
