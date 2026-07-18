-- ==========================================
-- MURSAL SaaS PLATFORM - DATABASE MIGRATION
-- AI Credits System (Supabase / PostgreSQL)
-- ==========================================

-- 1. Alter 'stores' table to support tracking AI credits
-- Defaults to 10 trial credits for new stores.
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS ai_credits INTEGER DEFAULT 10;

-- 2. Add validation constraint to ensure credits can never go negative
ALTER TABLE stores 
ADD CONSTRAINT check_positive_credits CHECK (ai_credits >= 0);

-- 3. Create a thread-safe, atomic RPC function to deduct credits
-- This prevents race conditions, multi-device abuse, and client-side tampering.
-- Usage from Supabase JS client:
-- const { data: remaining, error } = await supabase.rpc('deduct_ai_credits', { store_id_param: 'some-uuid' });

CREATE OR REPLACE FUNCTION deduct_ai_credits(store_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated schema privilege to ensure reliable update
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
