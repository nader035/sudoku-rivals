-- ============================================================================
-- Economy + Shop + Admin foundation for Sudoku Rival
-- ============================================================================
-- Adds:
-- - profiles, wallets, wallet_transactions
-- - shop_packages, purchases
-- - user_roles, admin_action_logs, platform_settings
-- - disputes, user_admin_notes, admin_alerts
-- - leaderboard_seasons, leaderboard_stats, public leaderboard view
-- - secure wallet/admin/manual-payment/match-fee RPCs
-- - RLS for all new tables
--
-- NOTE:
-- - Keeps existing players/rooms flow.
-- - Uses auth.users IDs for wallet + payment economy.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_transaction_type') THEN
    CREATE TYPE wallet_transaction_type AS ENUM (
      'purchase',
      'entry_fee',
      'prize_win',
      'refund',
      'admin_adjustment',
      'platform_fee',
      'bonus'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_transaction_status') THEN
    CREATE TYPE wallet_transaction_status AS ENUM (
      'pending',
      'completed',
      'failed',
      'reversed'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_payment_method') THEN
    CREATE TYPE purchase_payment_method AS ENUM ('vodafone_cash', 'instapay');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_payment_status') THEN
    CREATE TYPE purchase_payment_status AS ENUM (
      'awaiting_transfer',
      'pending_admin_review',
      'approved',
      'rejected',
      'cancelled',
      'refunded'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role_type') THEN
    CREATE TYPE admin_role_type AS ENUM ('super_admin', 'admin', 'support', 'finance');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dispute_status_type') THEN
    CREATE TYPE dispute_status_type AS ENUM ('open', 'reviewing', 'resolved', 'rejected');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_severity_type') THEN
    CREATE TYPE alert_severity_type AS ENUM ('low', 'medium', 'high', 'critical');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_status_type') THEN
    CREATE TYPE alert_status_type AS ENUM ('open', 'reviewing', 'resolved', 'dismissed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leaderboard_season_status_type') THEN
    CREATE TYPE leaderboard_season_status_type AS ENUM ('upcoming', 'active', 'completed', 'archived');
  END IF;
END $$;


CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  display_name TEXT,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  suspected_cheater BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique ON profiles(lower(username));


CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_coins_won BIGINT NOT NULL DEFAULT 0 CHECK (total_coins_won >= 0),
  total_coins_spent BIGINT NOT NULL DEFAULT 0 CHECK (total_coins_spent >= 0),
  total_coins_purchased BIGINT NOT NULL DEFAULT 0 CHECK (total_coins_purchased >= 0),
  is_frozen BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);


CREATE TABLE IF NOT EXISTS shop_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  coins_amount BIGINT NOT NULL CHECK (coins_amount > 0),
  bonus_coins BIGINT NOT NULL DEFAULT 0 CHECK (bonus_coins >= 0),
  price NUMERIC NOT NULL CHECK (price > 0),
  currency TEXT NOT NULL DEFAULT 'EGP',
  badge TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shop_packages_active_order ON shop_packages(is_active, sort_order, created_at);


CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES shop_packages(id),
  amount_paid NUMERIC NOT NULL CHECK (amount_paid > 0),
  currency TEXT NOT NULL DEFAULT 'EGP',
  coins_received BIGINT NOT NULL CHECK (coins_received > 0),
  payment_method purchase_payment_method NOT NULL,
  payment_destination TEXT NOT NULL,
  payment_reference TEXT,
  sender_phone TEXT,
  sender_name TEXT,
  transfer_screenshot_url TEXT,
  user_note TEXT,
  admin_note TEXT,
  payment_status purchase_payment_status NOT NULL DEFAULT 'awaiting_transfer',
  credited_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_user_id_created_at ON purchases(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(payment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_method ON purchases(payment_method, created_at DESC);


CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  type wallet_transaction_type NOT NULL,
  amount BIGINT NOT NULL,
  balance_before BIGINT NOT NULL,
  balance_after BIGINT NOT NULL CHECK (balance_after >= 0),
  status wallet_transaction_status NOT NULL DEFAULT 'completed',
  related_match_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  related_purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_match ON wallet_transactions(related_match_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_purchase ON wallet_transactions(related_purchase_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_transactions_unique_entry_fee
  ON wallet_transactions(user_id, related_match_id, type)
  WHERE type = 'entry_fee' AND related_match_id IS NOT NULL AND status = 'completed';

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_transactions_unique_prize_win
  ON wallet_transactions(user_id, related_match_id, type)
  WHERE type = 'prize_win' AND related_match_id IS NOT NULL AND status = 'completed';

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_transactions_unique_purchase_credit
  ON wallet_transactions(user_id, related_purchase_id, type)
  WHERE type = 'purchase' AND related_purchase_id IS NOT NULL AND status = 'completed';


CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role admin_role_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);


CREATE TABLE IF NOT EXISTS admin_action_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_action_logs_admin_created ON admin_action_logs(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_target ON admin_action_logs(target_type, target_id, created_at DESC);


CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  value_type TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  evidence JSONB,
  status dispute_status_type NOT NULL DEFAULT 'open',
  resolution TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);


CREATE TABLE IF NOT EXISTS user_admin_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS admin_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type TEXT NOT NULL,
  severity alert_severity_type NOT NULL DEFAULT 'medium',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  match_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  status alert_status_type NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS leaderboard_seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status leaderboard_season_status_type NOT NULL DEFAULT 'upcoming',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);


CREATE TABLE IF NOT EXISTS leaderboard_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID REFERENCES leaderboard_seasons(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wins INTEGER NOT NULL DEFAULT 0 CHECK (wins >= 0),
  losses INTEGER NOT NULL DEFAULT 0 CHECK (losses >= 0),
  total_coins_won BIGINT NOT NULL DEFAULT 0 CHECK (total_coins_won >= 0),
  total_entry_fees BIGINT NOT NULL DEFAULT 0 CHECK (total_entry_fees >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(season_id, user_id)
);


ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS entry_fee BIGINT NOT NULL DEFAULT 0 CHECK (entry_fee >= 0),
  ADD COLUMN IF NOT EXISTS prize_pool BIGINT NOT NULL DEFAULT 0 CHECK (prize_pool >= 0),
  ADD COLUMN IF NOT EXISTS platform_fee BIGINT NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  ADD COLUMN IF NOT EXISTS payout_done BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS refunds_done BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;


CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_touch_updated_at ON profiles;
CREATE TRIGGER trg_profiles_touch_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_wallets_touch_updated_at ON wallets;
CREATE TRIGGER trg_wallets_touch_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_shop_packages_touch_updated_at ON shop_packages;
CREATE TRIGGER trg_shop_packages_touch_updated_at
  BEFORE UPDATE ON shop_packages
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_purchases_touch_updated_at ON purchases;
CREATE TRIGGER trg_purchases_touch_updated_at
  BEFORE UPDATE ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_leaderboard_stats_touch_updated_at ON leaderboard_stats;
CREATE TRIGGER trg_leaderboard_stats_touch_updated_at
  BEFORE UPDATE ON leaderboard_stats
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();


CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = p_user_id AND ur.role IN ('super_admin', 'admin')
  ) OR EXISTS (
    SELECT 1 FROM players p WHERE p.auth_id = p_user_id AND p.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN is_admin(auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION has_admin_role(p_user_id UUID, p_required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p_user_id AND ur.role = 'super_admin') THEN
    RETURN TRUE;
  END IF;

  IF p_required_role = 'super_admin' THEN
    RETURN FALSE;
  END IF;

  IF p_required_role = 'admin' THEN
    RETURN EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p_user_id AND ur.role = 'admin')
      OR EXISTS (SELECT 1 FROM players p WHERE p.auth_id = p_user_id AND p.role = 'admin');
  END IF;

  IF p_required_role = 'finance' THEN
    RETURN EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = p_user_id AND ur.role IN ('finance', 'admin')
    ) OR EXISTS (
      SELECT 1 FROM players p WHERE p.auth_id = p_user_id AND p.role = 'admin'
    );
  END IF;

  IF p_required_role = 'support' THEN
    RETURN EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = p_user_id AND ur.role IN ('support', 'admin', 'finance')
    ) OR EXISTS (
      SELECT 1 FROM players p WHERE p.auth_id = p_user_id AND p.role = 'admin'
    );
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION has_admin_permission(p_user_id UUID, p_permission TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_permission IN ('approve_purchase', 'reject_purchase') THEN
    RETURN has_admin_role(p_user_id, 'finance') OR has_admin_role(p_user_id, 'admin');
  END IF;

  IF p_permission IN ('force_winner', 'hard_reset_leaderboard') THEN
    RETURN has_admin_role(p_user_id, 'super_admin');
  END IF;

  IF p_permission IN ('adjust_wallet', 'refund_match', 'manage_shop', 'manage_settings', 'ban_user') THEN
    RETURN has_admin_role(p_user_id, 'admin');
  END IF;

  IF p_permission IN ('support_refund') THEN
    RETURN has_admin_role(p_user_id, 'support') OR has_admin_role(p_user_id, 'admin');
  END IF;

  RETURN is_admin(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_wallet_balance(p_user_id UUID)
RETURNS BIGINT AS $$
DECLARE
  v_balance BIGINT;
BEGIN
  SELECT balance INTO v_balance FROM wallets WHERE user_id = p_user_id;
  RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION create_wallet_if_not_exists(p_user_id UUID)
RETURNS wallets AS $$
DECLARE
  v_wallet wallets;
BEGIN
  INSERT INTO wallets (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id;
  RETURN v_wallet;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_current_username(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_name TEXT;
BEGIN
  SELECT COALESCE(pr.username, p.username, 'Player')
  INTO v_name
  FROM auth.users u
  LEFT JOIN profiles pr ON pr.id = u.id
  LEFT JOIN players p ON p.auth_id = u.id
  WHERE u.id = p_user_id;

  RETURN COALESCE(v_name, 'Player');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_platform_setting_jsonb(p_key TEXT, p_default JSONB)
RETURNS JSONB AS $$
DECLARE
  v_value JSONB;
BEGIN
  SELECT value INTO v_value FROM platform_settings WHERE key = p_key;
  RETURN COALESCE(v_value, p_default);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION current_wallet_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION log_admin_action(
  p_action_type TEXT,
  p_target_type TEXT,
  p_target_id UUID,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO admin_action_logs (
    admin_id, action_type, target_type, target_id, old_value, new_value, reason
  )
  VALUES (
    auth.uid(), p_action_type, p_target_type, p_target_id, p_old_value, p_new_value, p_reason
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION assert_wallet_actor_state(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_profile RECORD;
  v_wallet wallets;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF FOUND THEN
    IF v_profile.is_banned THEN
      RAISE EXCEPTION 'User is banned';
    END IF;
    IF v_profile.is_suspended THEN
      RAISE EXCEPTION 'User is suspended';
    END IF;
  END IF;

  SELECT * INTO v_wallet FROM create_wallet_if_not_exists(p_user_id);
  IF v_wallet.is_frozen THEN
    RAISE EXCEPTION 'Wallet is frozen';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION debit_wallet(
  p_user_id UUID,
  p_amount BIGINT,
  p_transaction_type wallet_transaction_type,
  p_related_match_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_related_purchase_id UUID DEFAULT NULL
)
RETURNS wallet_transactions AS $$
DECLARE
  v_wallet wallets;
  v_before BIGINT;
  v_after BIGINT;
  v_tx wallet_transactions;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Debit amount must be positive';
  END IF;

  PERFORM create_wallet_if_not_exists(p_user_id);

  SELECT * INTO v_wallet
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_wallet.is_frozen THEN
    RAISE EXCEPTION 'Wallet is frozen';
  END IF;

  v_before := v_wallet.balance;
  v_after := v_before - p_amount;

  IF v_after < 0 THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE wallets
  SET
    balance = v_after,
    total_coins_spent = total_coins_spent + p_amount,
    updated_at = NOW()
  WHERE id = v_wallet.id;

  INSERT INTO wallet_transactions (
    user_id,
    wallet_id,
    type,
    amount,
    balance_before,
    balance_after,
    status,
    related_match_id,
    related_purchase_id,
    reason
  )
  VALUES (
    p_user_id,
    v_wallet.id,
    p_transaction_type,
    -p_amount,
    v_before,
    v_after,
    'completed',
    p_related_match_id,
    p_related_purchase_id,
    p_reason
  )
  RETURNING * INTO v_tx;

  RETURN v_tx;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION credit_wallet(
  p_user_id UUID,
  p_amount BIGINT,
  p_transaction_type wallet_transaction_type,
  p_related_match_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_related_purchase_id UUID DEFAULT NULL
)
RETURNS wallet_transactions AS $$
DECLARE
  v_wallet wallets;
  v_before BIGINT;
  v_after BIGINT;
  v_tx wallet_transactions;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Credit amount must be positive';
  END IF;

  PERFORM create_wallet_if_not_exists(p_user_id);

  SELECT * INTO v_wallet
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_wallet.is_frozen THEN
    RAISE EXCEPTION 'Wallet is frozen';
  END IF;

  v_before := v_wallet.balance;
  v_after := v_before + p_amount;

  UPDATE wallets
  SET
    balance = v_after,
    total_coins_won = CASE WHEN p_transaction_type = 'prize_win' THEN total_coins_won + p_amount ELSE total_coins_won END,
    total_coins_purchased = CASE WHEN p_transaction_type = 'purchase' THEN total_coins_purchased + p_amount ELSE total_coins_purchased END,
    updated_at = NOW()
  WHERE id = v_wallet.id;

  INSERT INTO wallet_transactions (
    user_id,
    wallet_id,
    type,
    amount,
    balance_before,
    balance_after,
    status,
    related_match_id,
    related_purchase_id,
    reason
  )
  VALUES (
    p_user_id,
    v_wallet.id,
    p_transaction_type,
    p_amount,
    v_before,
    v_after,
    'completed',
    p_related_match_id,
    p_related_purchase_id,
    p_reason
  )
  RETURNING * INTO v_tx;

  RETURN v_tx;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_allowed_entry_fees()
RETURNS BIGINT[] AS $$
DECLARE
  v_json JSONB;
  v_text TEXT;
  v_values BIGINT[];
BEGIN
  v_json := get_platform_setting_jsonb('allowed_match_entry_fees', '[10,50,100,500]'::JSONB);
  v_text := (
    SELECT string_agg(value::TEXT, ',')
    FROM jsonb_array_elements_text(v_json) value
  );

  IF v_text IS NULL OR length(trim(v_text)) = 0 THEN
    RETURN ARRAY[10, 50, 100, 500]::BIGINT[];
  END IF;

  EXECUTE format('SELECT ARRAY[%s]::BIGINT[]', v_text) INTO v_values;
  RETURN v_values;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION create_manual_purchase(
  p_package_id UUID,
  p_payment_method purchase_payment_method,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS purchases AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_package shop_packages;
  v_purchase purchases;
  v_key TEXT;
  v_destination TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_package
  FROM shop_packages
  WHERE id = p_package_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or inactive package';
  END IF;

  IF p_payment_method = 'vodafone_cash' THEN
    v_destination := get_platform_setting_jsonb('vodafone_cash_number', to_jsonb('+01022175316')) #>> '{}';
  ELSE
    v_destination := get_platform_setting_jsonb('instapay_link', to_jsonb('https://ipn.eg/S/naderas109n/instapay/5ph2Pv')) #>> '{}';
  END IF;

  v_key := COALESCE(NULLIF(trim(p_idempotency_key), ''), format('purchase-%s-%s', v_user_id::TEXT, uuid_generate_v4()::TEXT));

  INSERT INTO purchases (
    user_id,
    package_id,
    amount_paid,
    currency,
    coins_received,
    payment_method,
    payment_destination,
    payment_status,
    idempotency_key
  )
  VALUES (
    v_user_id,
    v_package.id,
    v_package.price,
    v_package.currency,
    v_package.coins_amount + v_package.bonus_coins,
    p_payment_method,
    v_destination,
    'awaiting_transfer',
    v_key
  )
  RETURNING * INTO v_purchase;

  RETURN v_purchase;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION confirm_manual_purchase_transfer(
  p_purchase_id UUID,
  p_sender_phone TEXT,
  p_sender_name TEXT DEFAULT NULL,
  p_payment_reference TEXT DEFAULT NULL,
  p_transfer_screenshot_url TEXT DEFAULT NULL,
  p_user_note TEXT DEFAULT NULL
)
RETURNS purchases AS $$
DECLARE
  v_purchase purchases;
BEGIN
  SELECT * INTO v_purchase
  FROM purchases
  WHERE id = p_purchase_id AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase not found';
  END IF;

  IF v_purchase.payment_status NOT IN ('awaiting_transfer', 'pending_admin_review') THEN
    RAISE EXCEPTION 'Purchase cannot be updated in current status';
  END IF;

  IF p_sender_phone IS NULL OR length(trim(p_sender_phone)) < 7 THEN
    RAISE EXCEPTION 'Sender phone is required';
  END IF;

  UPDATE purchases
  SET
    sender_phone = trim(p_sender_phone),
    sender_name = NULLIF(trim(COALESCE(p_sender_name, '')), ''),
    payment_reference = NULLIF(trim(COALESCE(p_payment_reference, '')), ''),
    transfer_screenshot_url = NULLIF(trim(COALESCE(p_transfer_screenshot_url, '')), ''),
    user_note = NULLIF(trim(COALESCE(p_user_note, '')), ''),
    payment_status = 'pending_admin_review',
    updated_at = NOW()
  WHERE id = p_purchase_id
  RETURNING * INTO v_purchase;

  RETURN v_purchase;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION admin_approve_purchase(p_purchase_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS purchases AS $$
DECLARE
  v_purchase purchases;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF NOT has_admin_permission(v_user_id, 'approve_purchase') THEN
    RAISE EXCEPTION 'Admin permission required';
  END IF;

  SELECT * INTO v_purchase
  FROM purchases
  WHERE id = p_purchase_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase not found';
  END IF;

  IF v_purchase.payment_status = 'approved' THEN
    RAISE EXCEPTION 'Purchase already approved';
  END IF;

  IF v_purchase.payment_status IN ('rejected', 'cancelled', 'refunded') THEN
    RAISE EXCEPTION 'Purchase cannot be approved in current status';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM wallet_transactions wt
    WHERE wt.related_purchase_id = v_purchase.id
      AND wt.type = 'purchase'
      AND wt.status = 'completed'
  ) THEN
    RAISE EXCEPTION 'Purchase already credited';
  END IF;

  PERFORM credit_wallet(
    v_purchase.user_id,
    v_purchase.coins_received,
    'purchase',
    NULL,
    COALESCE(p_reason, 'Manual purchase approved'),
    v_purchase.id
  );

  UPDATE purchases
  SET
    payment_status = 'approved',
    reviewed_by = v_user_id,
    reviewed_at = NOW(),
    credited_at = NOW(),
    admin_note = COALESCE(NULLIF(trim(COALESCE(p_reason, '')), ''), admin_note),
    updated_at = NOW()
  WHERE id = v_purchase.id
  RETURNING * INTO v_purchase;

  PERFORM log_admin_action(
    'approve_purchase',
    'purchase',
    v_purchase.id,
    jsonb_build_object('status', 'pending_admin_review'),
    jsonb_build_object('status', v_purchase.payment_status, 'coins_received', v_purchase.coins_received),
    p_reason
  );

  RETURN v_purchase;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION admin_reject_purchase(p_purchase_id UUID, p_rejection_reason TEXT)
RETURNS purchases AS $$
DECLARE
  v_purchase purchases;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF NOT has_admin_permission(v_user_id, 'reject_purchase') THEN
    RAISE EXCEPTION 'Admin permission required';
  END IF;

  IF p_rejection_reason IS NULL OR length(trim(p_rejection_reason)) < 3 THEN
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;

  SELECT * INTO v_purchase
  FROM purchases
  WHERE id = p_purchase_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase not found';
  END IF;

  IF v_purchase.payment_status = 'approved' THEN
    RAISE EXCEPTION 'Approved purchase cannot be rejected';
  END IF;

  UPDATE purchases
  SET
    payment_status = 'rejected',
    rejection_reason = trim(p_rejection_reason),
    reviewed_by = v_user_id,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = v_purchase.id
  RETURNING * INTO v_purchase;

  PERFORM log_admin_action(
    'reject_purchase',
    'purchase',
    v_purchase.id,
    jsonb_build_object('status', 'pending_admin_review'),
    jsonb_build_object('status', v_purchase.payment_status, 'reason', v_purchase.rejection_reason),
    p_rejection_reason
  );

  RETURN v_purchase;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_room_user_auth_id(p_player_id UUID)
RETURNS UUID AS $$
DECLARE
  v_auth_id UUID;
BEGIN
  SELECT auth_id INTO v_auth_id FROM players WHERE id = p_player_id;
  RETURN v_auth_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION create_room(
  p_name TEXT,
  p_difficulty TEXT,
  p_max_players INTEGER,
  p_is_private BOOLEAN,
  p_password_hash TEXT,
  p_puzzle JSONB,
  p_solution JSONB,
  p_initial_board JSONB,
  p_allow_hints BOOLEAN,
  p_allow_mistakes BOOLEAN,
  p_max_mistakes INTEGER,
  p_freeze_duration INTEGER,
  p_mega_freeze_duration INTEGER,
  p_entry_fee BIGINT DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  v_host_player_id UUID;
  v_host_auth_id UUID;
  v_room_id UUID;
  v_password_hash TEXT := NULL;
  v_difficulty TEXT;
  v_input_password TEXT;
  v_entry_fee BIGINT;
BEGIN
  v_host_player_id := current_player_id();
  IF v_host_player_id IS NULL THEN
    RAISE EXCEPTION 'No current player profile found';
  END IF;

  v_host_auth_id := auth.uid();
  IF v_host_auth_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  PERFORM assert_wallet_actor_state(v_host_auth_id);

  v_difficulty := lower(trim(COALESCE(p_difficulty, 'medium')));
  IF v_difficulty NOT IN ('easy', 'medium', 'hard') THEN
    v_difficulty := 'medium';
  END IF;

  v_entry_fee := GREATEST(COALESCE(p_entry_fee, 0), 0);
  IF v_entry_fee > 0 AND NOT (v_entry_fee = ANY(get_allowed_entry_fees())) THEN
    RAISE EXCEPTION 'Invalid entry fee';
  END IF;

  IF p_is_private THEN
    v_input_password := NULLIF(trim(COALESCE(p_password_hash, '')), '');
    IF v_input_password IS NULL THEN
      RAISE EXCEPTION 'Password is required for private rooms';
    END IF;

    IF to_regprocedure('extensions.gen_salt(text)') IS NOT NULL
      AND to_regprocedure('extensions.crypt(text,text)') IS NOT NULL THEN
      EXECUTE 'SELECT extensions.crypt($1, extensions.gen_salt(''bf''))'
      INTO v_password_hash
      USING v_input_password;
    ELSIF to_regprocedure('public.gen_salt(text)') IS NOT NULL
      AND to_regprocedure('public.crypt(text,text)') IS NOT NULL THEN
      EXECUTE 'SELECT public.crypt($1, public.gen_salt(''bf''))'
      INTO v_password_hash
      USING v_input_password;
    ELSIF to_regprocedure('gen_salt(text)') IS NOT NULL
      AND to_regprocedure('crypt(text,text)') IS NOT NULL THEN
      EXECUTE 'SELECT crypt($1, gen_salt(''bf''))'
      INTO v_password_hash
      USING v_input_password;
    ELSE
      v_password_hash := md5(v_input_password);
    END IF;
  END IF;

  IF v_entry_fee > 0 THEN
    PERFORM debit_wallet(
      v_host_auth_id,
      v_entry_fee,
      'entry_fee',
      NULL,
      format('Entry fee reserved for room creation: %s', trim(p_name)),
      NULL
    );
  END IF;

  INSERT INTO rooms (
    name,
    difficulty,
    max_players,
    current_players,
    status,
    is_private,
    password_hash,
    host_id,
    puzzle,
    solution,
    initial_board,
    allow_hints,
    allow_mistakes,
    max_mistakes,
    freeze_duration,
    mega_freeze_duration,
    entry_fee,
    prize_pool
  )
  VALUES (
    trim(p_name),
    v_difficulty,
    p_max_players,
    0,
    'waiting',
    p_is_private,
    v_password_hash,
    v_host_player_id,
    p_puzzle,
    p_solution,
    p_initial_board,
    p_allow_hints,
    p_allow_mistakes,
    p_max_mistakes,
    p_freeze_duration,
    p_mega_freeze_duration,
    v_entry_fee,
    v_entry_fee
  )
  RETURNING id INTO v_room_id;

  UPDATE wallet_transactions wt
  SET related_match_id = v_room_id
  WHERE wt.id = (
    SELECT id
    FROM wallet_transactions
    WHERE user_id = v_host_auth_id
      AND type = 'entry_fee'
      AND related_match_id IS NULL
      AND reason LIKE 'Entry fee reserved for room creation:%'
    ORDER BY created_at DESC
    LIMIT 1
  );

  INSERT INTO room_players (
    room_id,
    player_id,
    progress,
    mistakes,
    hints_used,
    board,
    frozen_until,
    mega_freeze_count,
    is_finished,
    finish_position,
    completion_time,
    started_at,
    finished_at,
    last_move_at
  )
  VALUES (
    v_room_id,
    v_host_player_id,
    0,
    0,
    0,
    p_initial_board,
    NULL,
    0,
    false,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  );

  RETURN v_room_id;
EXCEPTION WHEN OTHERS THEN
  IF v_entry_fee > 0 THEN
    PERFORM credit_wallet(
      auth.uid(),
      v_entry_fee,
      'refund',
      NULL,
      'Auto-refund: room creation failed',
      NULL
    );
  END IF;
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;


CREATE OR REPLACE FUNCTION join_room(
  p_room_id UUID,
  p_player_id UUID,
  p_password TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_room RECORD;
  v_input_password TEXT;
  v_compare_hash TEXT;
  v_joiner_auth_id UUID;
BEGIN
  SELECT * INTO v_room
  FROM rooms
  WHERE id = p_room_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room not found');
  END IF;

  IF v_room.status != 'waiting' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room is not accepting players');
  END IF;

  IF v_room.current_players >= v_room.max_players THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room is full');
  END IF;

  IF v_room.is_private AND v_room.password_hash IS NOT NULL THEN
    v_input_password := NULLIF(trim(COALESCE(p_password, '')), '');
    IF v_input_password IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid password');
    END IF;

    IF length(v_room.password_hash) = 32 AND v_room.password_hash !~ '^\$' THEN
      IF md5(v_input_password) != v_room.password_hash THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid password');
      END IF;
    ELSE
      IF to_regprocedure('extensions.crypt(text,text)') IS NOT NULL THEN
        EXECUTE 'SELECT extensions.crypt($1, $2)' INTO v_compare_hash USING v_input_password, v_room.password_hash;
      ELSIF to_regprocedure('public.crypt(text,text)') IS NOT NULL THEN
        EXECUTE 'SELECT public.crypt($1, $2)' INTO v_compare_hash USING v_input_password, v_room.password_hash;
      ELSIF to_regprocedure('crypt(text,text)') IS NOT NULL THEN
        EXECUTE 'SELECT crypt($1, $2)' INTO v_compare_hash USING v_input_password, v_room.password_hash;
      ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Password verification unavailable');
      END IF;

      IF v_compare_hash IS NULL OR v_compare_hash != v_room.password_hash THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid password');
      END IF;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM room_players WHERE room_id = p_room_id AND player_id = p_player_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already in room');
  END IF;

  IF v_room.host_id = p_player_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Host is already in room');
  END IF;

  v_joiner_auth_id := get_room_user_auth_id(p_player_id);
  IF v_joiner_auth_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player account is not linked to auth');
  END IF;

  PERFORM assert_wallet_actor_state(v_joiner_auth_id);

  IF v_room.entry_fee > 0 THEN
    PERFORM debit_wallet(
      v_joiner_auth_id,
      v_room.entry_fee,
      'entry_fee',
      p_room_id,
      format('Entry fee paid to join room %s', p_room_id),
      NULL
    );
  END IF;

  INSERT INTO room_players (room_id, player_id, board, progress, mistakes, hints_used, is_finished)
  VALUES (p_room_id, p_player_id, v_room.initial_board, 0, 0, 0, false);

  UPDATE rooms
  SET prize_pool = prize_pool + COALESCE(v_room.entry_fee, 0)
  WHERE id = p_room_id;

  RETURN jsonb_build_object('success', true, 'room_id', p_room_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;


CREATE OR REPLACE FUNCTION finalize_room_with_winner(
  p_room_id UUID,
  p_winner_id UUID,
  p_winning_time INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_room RECORD;
  v_participant RECORD;
  v_player_count INTEGER;
  v_total_mistakes INTEGER;
  v_total_hints_used INTEGER;
  v_average_completion_time INTEGER;
  v_winner_auth_id UUID;
  v_platform_fee_percent NUMERIC;
  v_platform_fee BIGINT;
  v_payout BIGINT;
BEGIN
  SELECT * INTO v_room FROM rooms WHERE id = p_room_id FOR UPDATE;

  IF NOT FOUND OR v_room.status != 'active' THEN
    RETURN;
  END IF;

  IF COALESCE(v_room.payout_done, false) THEN
    RETURN;
  END IF;

  v_platform_fee_percent := COALESCE((get_platform_setting_jsonb('platform_fee_percentage', '0'::JSONB))::TEXT::NUMERIC, 0);
  v_platform_fee := FLOOR((COALESCE(v_room.prize_pool, 0) * GREATEST(v_platform_fee_percent, 0)) / 100.0)::BIGINT;
  v_payout := GREATEST(COALESCE(v_room.prize_pool, 0) - v_platform_fee, 0);

  UPDATE rooms
  SET
    status = 'finished',
    finished_at = NOW(),
    winner_id = p_winner_id,
    winning_time = p_winning_time,
    platform_fee = v_platform_fee,
    payout_done = true
  WHERE id = p_room_id;

  v_winner_auth_id := get_room_user_auth_id(p_winner_id);

  IF v_winner_auth_id IS NOT NULL AND v_payout > 0 AND NOT EXISTS (
    SELECT 1 FROM wallet_transactions wt
    WHERE wt.user_id = v_winner_auth_id
      AND wt.related_match_id = p_room_id
      AND wt.type = 'prize_win'
      AND wt.status = 'completed'
  ) THEN
    PERFORM credit_wallet(
      v_winner_auth_id,
      v_payout,
      'prize_win',
      p_room_id,
      'Prize pool payout',
      NULL
    );
  END IF;

  SELECT
    COUNT(rp.player_id)::INTEGER,
    COALESCE(SUM(rp.mistakes), 0)::INTEGER,
    COALESCE(SUM(rp.hints_used), 0)::INTEGER,
    AVG(rp.completion_time)::INTEGER
  INTO
    v_player_count,
    v_total_mistakes,
    v_total_hints_used,
    v_average_completion_time
  FROM room_players rp
  WHERE rp.room_id = p_room_id;

  INSERT INTO game_history (
    room_id,
    difficulty,
    player_count,
    winner_id,
    winning_time,
    total_mistakes,
    total_hints_used,
    average_completion_time,
    puzzle,
    solution,
    started_at,
    finished_at
  )
  VALUES (
    p_room_id,
    v_room.difficulty,
    COALESCE(v_player_count, 0),
    p_winner_id,
    p_winning_time,
    COALESCE(v_total_mistakes, 0),
    COALESCE(v_total_hints_used, 0),
    v_average_completion_time,
    v_room.puzzle,
    v_room.solution,
    v_room.started_at,
    NOW()
  );

  FOR v_participant IN
    SELECT rp.player_id, rp.completion_time, p.auth_id AS auth_user_id
    FROM room_players rp
    JOIN players p ON p.id = rp.player_id
    WHERE rp.room_id = p_room_id
  LOOP
    PERFORM update_player_stats(
      v_participant.player_id,
      v_participant.player_id = p_winner_id,
      v_room.difficulty,
      v_participant.completion_time
    );

    INSERT INTO leaderboard_stats (season_id, user_id, wins, losses, total_coins_won, total_entry_fees)
    VALUES (
      NULL,
      v_participant.auth_user_id,
      CASE WHEN v_participant.player_id = p_winner_id THEN 1 ELSE 0 END,
      CASE WHEN v_participant.player_id = p_winner_id THEN 0 ELSE 1 END,
      CASE WHEN v_participant.player_id = p_winner_id THEN v_payout ELSE 0 END,
      COALESCE(v_room.entry_fee, 0)
    )
    ON CONFLICT (season_id, user_id) DO UPDATE
    SET
      wins = leaderboard_stats.wins + EXCLUDED.wins,
      losses = leaderboard_stats.losses + EXCLUDED.losses,
      total_coins_won = leaderboard_stats.total_coins_won + EXCLUDED.total_coins_won,
      total_entry_fees = leaderboard_stats.total_entry_fees + EXCLUDED.total_entry_fees,
      updated_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


CREATE OR REPLACE FUNCTION forfeit_room(
  p_room_id UUID,
  p_player_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_room RECORD;
  v_next_host UUID;
  v_host_auth_id UUID;
BEGIN
  SELECT * INTO v_room FROM rooms WHERE id = p_room_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room not found');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM room_players
    WHERE room_id = p_room_id AND player_id = p_player_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player is not in this room');
  END IF;

  IF v_room.status = 'waiting' THEN
    IF v_room.host_id = p_player_id AND COALESCE(v_room.entry_fee, 0) > 0 THEN
      v_host_auth_id := get_room_user_auth_id(v_room.host_id);
      IF v_host_auth_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM wallet_transactions
        WHERE user_id = v_host_auth_id
          AND related_match_id = p_room_id
          AND type = 'refund'
          AND status = 'completed'
      ) THEN
        PERFORM credit_wallet(
          v_host_auth_id,
          COALESCE(v_room.entry_fee, 0),
          'refund',
          p_room_id,
          'Refund: waiting room cancelled/forfeited before start',
          NULL
        );
      END IF;
    END IF;

    DELETE FROM room_players
    WHERE room_id = p_room_id AND player_id = p_player_id;

    IF NOT EXISTS (SELECT 1 FROM room_players WHERE room_id = p_room_id) THEN
      DELETE FROM rooms WHERE id = p_room_id;
      RETURN jsonb_build_object('success', true, 'deleted', true);
    END IF;

    IF v_room.host_id = p_player_id THEN
      SELECT player_id INTO v_next_host
      FROM room_players
      WHERE room_id = p_room_id
      ORDER BY joined_at ASC
      LIMIT 1;

      UPDATE rooms SET host_id = v_next_host WHERE id = p_room_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'left', true);
  END IF;

  IF v_room.status = 'active' THEN
    UPDATE rooms
    SET status = 'cancelled', finished_at = NOW()
    WHERE id = p_room_id;

    RETURN jsonb_build_object('success', true, 'cancelled', true);
  END IF;

  RETURN jsonb_build_object('success', true, 'closed', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION admin_adjust_wallet(
  p_target_user_id UUID,
  p_amount BIGINT,
  p_reason TEXT
)
RETURNS wallet_transactions AS $$
DECLARE
  v_tx wallet_transactions;
BEGIN
  IF NOT has_admin_permission(auth.uid(), 'adjust_wallet') THEN
    RAISE EXCEPTION 'Admin permission required';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'Adjustment reason is required';
  END IF;

  IF p_amount = 0 THEN
    RAISE EXCEPTION 'Adjustment amount cannot be zero';
  END IF;

  IF p_amount > 0 THEN
    v_tx := credit_wallet(
      p_target_user_id,
      p_amount,
      'admin_adjustment',
      NULL,
      p_reason,
      NULL
    );
  ELSE
    v_tx := debit_wallet(
      p_target_user_id,
      ABS(p_amount),
      'admin_adjustment',
      NULL,
      p_reason,
      NULL
    );
  END IF;

  UPDATE wallet_transactions
  SET admin_id = auth.uid()
  WHERE id = v_tx.id;

  PERFORM log_admin_action(
    'admin_adjust_wallet',
    'wallet',
    v_tx.wallet_id,
    NULL,
    jsonb_build_object('amount', p_amount, 'target_user_id', p_target_user_id),
    p_reason
  );

  RETURN v_tx;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION admin_refund_match(
  p_match_id UUID,
  p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_room RECORD;
  v_participant RECORD;
BEGIN
  IF NOT has_admin_permission(auth.uid(), 'refund_match') THEN
    RAISE EXCEPTION 'Admin permission required';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'Refund reason is required';
  END IF;

  SELECT * INTO v_room FROM rooms WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF v_room.refunds_done THEN
    RAISE EXCEPTION 'Match refund already processed';
  END IF;

  FOR v_participant IN
    SELECT p.auth_id AS auth_user_id
    FROM room_players rp
    JOIN players p ON p.id = rp.player_id
    WHERE rp.room_id = p_match_id
  LOOP
    IF v_participant.auth_user_id IS NOT NULL AND COALESCE(v_room.entry_fee, 0) > 0 AND NOT EXISTS (
      SELECT 1 FROM wallet_transactions wt
      WHERE wt.user_id = v_participant.auth_user_id
        AND wt.related_match_id = p_match_id
        AND wt.type = 'refund'
        AND wt.status = 'completed'
    ) THEN
      PERFORM credit_wallet(
        v_participant.auth_user_id,
        COALESCE(v_room.entry_fee, 0),
        'refund',
        p_match_id,
        p_reason,
        NULL
      );
    END IF;
  END LOOP;

  UPDATE rooms
  SET
    refunds_done = true,
    status = CASE WHEN status IN ('waiting', 'active') THEN 'cancelled' ELSE status END,
    finished_at = COALESCE(finished_at, NOW())
  WHERE id = p_match_id;

  PERFORM log_admin_action(
    'admin_refund_match',
    'room',
    p_match_id,
    NULL,
    jsonb_build_object('entry_fee', v_room.entry_fee),
    p_reason
  );

  RETURN jsonb_build_object('success', true, 'match_id', p_match_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION admin_force_winner(
  p_match_id UUID,
  p_winner_player_id UUID,
  p_reason TEXT
)
RETURNS JSONB AS $$
BEGIN
  IF NOT has_admin_permission(auth.uid(), 'force_winner') THEN
    RAISE EXCEPTION 'Super admin permission required';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'Reason is required';
  END IF;

  PERFORM finalize_room_with_winner(p_match_id, p_winner_player_id, NULL);

  PERFORM log_admin_action(
    'admin_force_winner',
    'room',
    p_match_id,
    NULL,
    jsonb_build_object('winner_player_id', p_winner_player_id),
    p_reason
  );

  RETURN jsonb_build_object('success', true, 'match_id', p_match_id, 'winner_id', p_winner_player_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE VIEW leaderboard_public AS
SELECT
  p.id AS player_id,
  COALESCE(pr.username, p.username) AS username,
  pr.avatar_url,
  COALESCE(w.balance, 0) AS current_coins,
  COALESCE(w.total_coins_won, 0) AS total_coins_won,
  COALESCE(p.total_wins, 0) AS wins,
  GREATEST(COALESCE(p.total_games, 0) - COALESCE(p.total_wins, 0), 0) AS losses,
  CASE
    WHEN COALESCE(p.total_games, 0) = 0 THEN 0
    ELSE ROUND((COALESCE(p.total_wins, 0)::NUMERIC / p.total_games::NUMERIC) * 100, 2)
  END AS win_rate
FROM players p
LEFT JOIN profiles pr ON pr.id = p.auth_id
LEFT JOIN wallets w ON w.user_id = p.auth_id
WHERE COALESCE(p.is_banned, false) = false
  AND COALESCE(pr.is_banned, false) = false;


INSERT INTO profiles (id, username, avatar_url, display_name, is_banned, created_at, updated_at)
SELECT
  p.auth_id,
  p.username,
  p.avatar_url,
  p.display_name,
  COALESCE(p.is_banned, false),
  COALESCE(p.created_at, NOW()),
  COALESCE(p.updated_at, NOW())
FROM players p
WHERE p.auth_id IS NOT NULL
ON CONFLICT (id) DO UPDATE
SET
  username = EXCLUDED.username,
  avatar_url = EXCLUDED.avatar_url,
  display_name = EXCLUDED.display_name,
  is_banned = EXCLUDED.is_banned,
  updated_at = NOW();

INSERT INTO wallets (user_id)
SELECT p.auth_id
FROM players p
WHERE p.auth_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_roles (user_id, role)
SELECT p.auth_id, 'admin'::admin_role_type
FROM players p
WHERE p.auth_id IS NOT NULL AND p.role = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO shop_packages (name, coins_amount, bonus_coins, price, currency, badge, sort_order, is_active)
VALUES
  ('Starter Pack', 100, 0, 30, 'EGP', 'starter', 10, true),
  ('Value Pack', 500, 50, 140, 'EGP', 'value', 20, true),
  ('Pro Pack', 1000, 150, 270, 'EGP', 'pro', 30, true),
  ('Champion Pack', 5000, 1000, 1200, 'EGP', 'champion', 40, true)
ON CONFLICT DO NOTHING;

INSERT INTO platform_settings (key, value, value_type, description, updated_by)
VALUES
  ('allowed_match_entry_fees', '[10,50,100,500]'::JSONB, 'json', 'Allowed entry fees for matches', NULL),
  ('minimum_entry_fee', '10'::JSONB, 'number', 'Minimum allowed entry fee', NULL),
  ('maximum_entry_fee', '500'::JSONB, 'number', 'Maximum allowed entry fee', NULL),
  ('platform_fee_percentage', '0'::JSONB, 'number', 'Platform fee percent deducted from prize pool', NULL),
  ('match_expiration_minutes', '30'::JSONB, 'number', 'Minutes before waiting rooms expire', NULL),
  ('max_active_matches_per_user', '3'::JSONB, 'number', 'Maximum active matches per user', NULL),
  ('vodafone_cash_number', to_jsonb('+01022175316'::TEXT), 'text', 'Vodafone Cash destination number', NULL),
  ('instapay_link', to_jsonb('https://ipn.eg/S/naderas109n/instapay/5ph2Pv'::TEXT), 'text', 'InstaPay payment link', NULL),
  ('manual_payment_enabled', 'true'::JSONB, 'boolean', 'Enable manual purchase flow', NULL),
  ('automatic_coin_crediting', 'false'::JSONB, 'boolean', 'Auto-credit disabled for manual payments', NULL),
  ('free_starter_coins', '0'::JSONB, 'number', 'Starter coins granted for new users', NULL)
ON CONFLICT (key) DO NOTHING;


CREATE OR REPLACE FUNCTION sync_profile_wallet_from_players()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.auth_id IS NOT NULL THEN
    INSERT INTO profiles (id, username, avatar_url, display_name, is_banned, created_at, updated_at)
    VALUES (
      NEW.auth_id,
      NEW.username,
      NEW.avatar_url,
      NEW.display_name,
      COALESCE(NEW.is_banned, false),
      COALESCE(NEW.created_at, NOW()),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET
      username = EXCLUDED.username,
      avatar_url = EXCLUDED.avatar_url,
      display_name = EXCLUDED.display_name,
      is_banned = EXCLUDED.is_banned,
      updated_at = NOW();

    INSERT INTO wallets (user_id) VALUES (NEW.auth_id)
    ON CONFLICT (user_id) DO NOTHING;

    IF NEW.role = 'admin' THEN
      INSERT INTO user_roles (user_id, role)
      VALUES (NEW.auth_id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_players_sync_profile_wallet ON players;
CREATE TRIGGER trg_players_sync_profile_wallet
  AFTER INSERT OR UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_wallet_from_players();


ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_self" ON profiles;
CREATE POLICY "profiles_select_self" ON profiles
  FOR SELECT USING (id = auth.uid() OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "profiles_update_self_safe" ON profiles;
CREATE POLICY "profiles_update_self_safe" ON profiles
  FOR UPDATE USING (id = auth.uid() OR is_admin(auth.uid()))
  WITH CHECK (id = auth.uid() OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "wallets_select_self" ON wallets;
CREATE POLICY "wallets_select_self" ON wallets
  FOR SELECT USING (user_id = auth.uid() OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "wallet_transactions_select_self" ON wallet_transactions;
CREATE POLICY "wallet_transactions_select_self" ON wallet_transactions
  FOR SELECT USING (user_id = auth.uid() OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "shop_packages_public_read" ON shop_packages;
CREATE POLICY "shop_packages_public_read" ON shop_packages
  FOR SELECT USING (is_active = true OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "shop_packages_admin_manage" ON shop_packages;
CREATE POLICY "shop_packages_admin_manage" ON shop_packages
  FOR ALL USING (has_admin_permission(auth.uid(), 'manage_shop'))
  WITH CHECK (has_admin_permission(auth.uid(), 'manage_shop'));

DROP POLICY IF EXISTS "purchases_select_own" ON purchases;
CREATE POLICY "purchases_select_own" ON purchases
  FOR SELECT USING (user_id = auth.uid() OR has_admin_permission(auth.uid(), 'approve_purchase'));

DROP POLICY IF EXISTS "purchases_insert_own" ON purchases;
CREATE POLICY "purchases_insert_own" ON purchases
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "purchases_update_own_limited" ON purchases;
CREATE POLICY "purchases_update_own_limited" ON purchases
  FOR UPDATE USING (user_id = auth.uid() OR has_admin_permission(auth.uid(), 'approve_purchase'))
  WITH CHECK (user_id = auth.uid() OR has_admin_permission(auth.uid(), 'approve_purchase'));

DROP POLICY IF EXISTS "user_roles_admin_read" ON user_roles;
CREATE POLICY "user_roles_admin_read" ON user_roles
  FOR SELECT USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "user_roles_super_admin_manage" ON user_roles;
CREATE POLICY "user_roles_super_admin_manage" ON user_roles
  FOR ALL USING (has_admin_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_admin_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "admin_logs_admin_read" ON admin_action_logs;
CREATE POLICY "admin_logs_admin_read" ON admin_action_logs
  FOR SELECT USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "platform_settings_read_auth" ON platform_settings;
CREATE POLICY "platform_settings_read_auth" ON platform_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "platform_settings_admin_manage" ON platform_settings;
CREATE POLICY "platform_settings_admin_manage" ON platform_settings
  FOR ALL USING (has_admin_permission(auth.uid(), 'manage_settings'))
  WITH CHECK (has_admin_permission(auth.uid(), 'manage_settings'));

DROP POLICY IF EXISTS "disputes_select_own_or_admin" ON disputes;
CREATE POLICY "disputes_select_own_or_admin" ON disputes
  FOR SELECT USING (reported_by = auth.uid() OR has_admin_permission(auth.uid(), 'support_refund'));

DROP POLICY IF EXISTS "disputes_insert_own" ON disputes;
CREATE POLICY "disputes_insert_own" ON disputes
  FOR INSERT WITH CHECK (reported_by = auth.uid());

DROP POLICY IF EXISTS "disputes_admin_update" ON disputes;
CREATE POLICY "disputes_admin_update" ON disputes
  FOR UPDATE USING (has_admin_permission(auth.uid(), 'support_refund'))
  WITH CHECK (has_admin_permission(auth.uid(), 'support_refund'));

DROP POLICY IF EXISTS "user_notes_admin_only" ON user_admin_notes;
CREATE POLICY "user_notes_admin_only" ON user_admin_notes
  FOR ALL USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_alerts_admin_only" ON admin_alerts;
CREATE POLICY "admin_alerts_admin_only" ON admin_alerts
  FOR ALL USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "leaderboard_seasons_public_read" ON leaderboard_seasons;
CREATE POLICY "leaderboard_seasons_public_read" ON leaderboard_seasons
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "leaderboard_seasons_admin_manage" ON leaderboard_seasons;
CREATE POLICY "leaderboard_seasons_admin_manage" ON leaderboard_seasons
  FOR ALL USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "leaderboard_stats_public_read" ON leaderboard_stats;
CREATE POLICY "leaderboard_stats_public_read" ON leaderboard_stats
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "leaderboard_stats_admin_manage" ON leaderboard_stats;
CREATE POLICY "leaderboard_stats_admin_manage" ON leaderboard_stats
  FOR ALL USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));


ALTER PUBLICATION supabase_realtime ADD TABLE wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE wallet_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE purchases;
ALTER PUBLICATION supabase_realtime ADD TABLE shop_packages;
ALTER PUBLICATION supabase_realtime ADD TABLE admin_alerts;


GRANT SELECT ON leaderboard_public TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION has_admin_role(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION has_admin_permission(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_wallet_balance(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION create_wallet_if_not_exists(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_manual_purchase(UUID, purchase_payment_method, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_manual_purchase_transfer(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_approve_purchase(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_reject_purchase(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_adjust_wallet(UUID, BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_refund_match(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_force_winner(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_room(TEXT, TEXT, INTEGER, BOOLEAN, TEXT, JSONB, JSONB, JSONB, BOOLEAN, BOOLEAN, INTEGER, INTEGER, INTEGER, BIGINT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION join_room(UUID, UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION finalize_room_with_winner(UUID, UUID, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION forfeit_room(UUID, UUID) TO authenticated, anon;

DO $$
BEGIN
  RAISE NOTICE 'Economy + shop + admin foundation installed.';
END $$;
