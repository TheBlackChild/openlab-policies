-- CasinoOps V2 — PostgreSQL Schema
-- Run: node server/migrate.js

-- ENUMS
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('system_admin','management','shift_manager','pit_boss','staff');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE staff_position AS ENUM ('dealer','dealer_inspector','inspector','pit_boss','shift_manager','cashier');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE staff_status_enum AS ENUM ('on_table','break','checked_in','off_shift');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE table_status_enum AS ENUM ('open','closed','incident','fill_required');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE incident_status_enum AS ENUM ('open','reviewing','resolved');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE fill_status_enum AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE vip_level_enum AS ENUM ('standard','silver','gold','platinum');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE shift_code_enum AS ENUM ('M','D','N');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- HALLS
CREATE TABLE IF NOT EXISTS halls (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CHIPS
CREATE TABLE IF NOT EXISTS chips (
  id TEXT PRIMARY KEY,
  color TEXT NOT NULL,
  hex TEXT NOT NULL DEFAULT '#ffffff',
  value NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- STAFF
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emp_no TEXT UNIQUE NOT NULL,
  position staff_position NOT NULL,
  hall_id TEXT REFERENCES halls(id) ON DELETE SET NULL,
  status staff_status_enum NOT NULL DEFAULT 'off_shift',
  staff_status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- USERS (login accounts)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  staff_id TEXT REFERENCES staff(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  emp_no TEXT UNIQUE NOT NULL,
  email TEXT,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'staff',
  phone TEXT,
  bio TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- TABLES
CREATE TABLE IF NOT EXISTS tables (
  id TEXT PRIMARY KEY,
  hall_id TEXT REFERENCES halls(id) ON DELETE SET NULL,
  game_type TEXT NOT NULL DEFAULT 'Blackjack',
  table_name TEXT,
  status table_status_enum NOT NULL DEFAULT 'closed',
  min_bet NUMERIC DEFAULT 500,
  max_bet NUMERIC DEFAULT 10000,
  dealer_id TEXT REFERENCES staff(id) ON DELETE SET NULL,
  inspector_id TEXT REFERENCES staff(id) ON DELETE SET NULL,
  chip_total NUMERIC DEFAULT 0,
  float_capacity NUMERIC DEFAULT 0,
  opening_float NUMERIC DEFAULT 0,
  opened_at TEXT,
  opened_date TEXT,
  chip_breakdown JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- SHIFTS (definitions: Morning/Day/Night)
CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  shift_code shift_code_enum NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- SHIFT STATE (single-row: current operational shift)
CREATE TABLE IF NOT EXISTS shift_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'closed',
  type TEXT,
  opened_at TEXT,
  opened_date TEXT,
  opened_by TEXT,
  history JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO shift_state (id) VALUES (1) ON CONFLICT DO NOTHING;

-- FILLS
CREATE TABLE IF NOT EXISTS fills (
  id TEXT PRIMARY KEY,
  table_id TEXT REFERENCES tables(id) ON DELETE SET NULL,
  denomination_label TEXT,
  denomination_id TEXT,
  quantity INTEGER DEFAULT 0,
  total NUMERIC DEFAULT 0,
  amount NUMERIC DEFAULT 0,
  status fill_status_enum NOT NULL DEFAULT 'pending',
  requested_by TEXT,
  time_str TEXT,
  sig_shift_mgr BOOLEAN DEFAULT false,
  sig_pit_boss BOOLEAN DEFAULT false,
  sig_gi BOOLEAN DEFAULT false,
  denom_lines JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- INCIDENTS
CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  table_id TEXT REFERENCES tables(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'dispute',
  description TEXT,
  status incident_status_enum NOT NULL DEFAULT 'open',
  reported_by TEXT,
  time_str TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  vip_level vip_level_enum NOT NULL DEFAULT 'standard',
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  table_id TEXT REFERENCES tables(id) ON DELETE SET NULL,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('drop','win')),
  amount NUMERIC NOT NULL,
  time_str TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE TRANSFERS
CREATE TABLE IF NOT EXISTS table_transfers (
  id TEXT PRIMARY KEY,
  from_table_id TEXT REFERENCES tables(id) ON DELETE SET NULL,
  to_table_id TEXT REFERENCES tables(id) ON DELETE SET NULL,
  dealer_id TEXT REFERENCES staff(id) ON DELETE SET NULL,
  pit_boss_id TEXT REFERENCES staff(id) ON DELETE SET NULL,
  notes TEXT,
  denom_qtys JSONB DEFAULT '{}',
  time_str TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ATTENDANCE LOG
CREATE TABLE IF NOT EXISTS attendance_log (
  id TEXT PRIMARY KEY,
  staff_id TEXT REFERENCES staff(id) ON DELETE CASCADE,
  shift TEXT NOT NULL,
  check_in TEXT,
  check_out TEXT,
  shift_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CHIP COUNT LOG
CREATE TABLE IF NOT EXISTS chip_count_log (
  id TEXT PRIMARY KEY,
  table_id TEXT REFERENCES tables(id) ON DELETE SET NULL,
  prev_float NUMERIC,
  new_float NUMERIC,
  diff NUMERIC,
  inspector TEXT,
  time_str TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ACTIVITY LOG
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  action TEXT,
  detail TEXT,
  icon TEXT,
  time_str TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CASINO INFO (single row)
CREATE TABLE IF NOT EXISTS casino_info (
  id INTEGER PRIMARY KEY DEFAULT 1,
  name TEXT DEFAULT 'Grand Casino',
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  reg_no TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO casino_info (id) VALUES (1) ON CONFLICT DO NOTHING;

-- FORM TEMPLATES
CREATE TABLE IF NOT EXISTS form_templates (
  key TEXT PRIMARY KEY,
  custom_header TEXT DEFAULT '',
  custom_footer TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ROLE PERMISSIONS
CREATE TABLE IF NOT EXISTS role_permissions (
  role TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  PRIMARY KEY (role, permission_key)
);

-- HOUSE FLOAT (single row: cage reserve)
CREATE TABLE IF NOT EXISTS house_float (
  id INTEGER PRIMARY KEY DEFAULT 1,
  amount NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO house_float (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tables_hall ON tables(hall_id);
CREATE INDEX IF NOT EXISTS idx_staff_hall ON staff(hall_id);
CREATE INDEX IF NOT EXISTS idx_fills_table ON fills(table_id);
CREATE INDEX IF NOT EXISTS idx_incidents_table ON incidents(table_id);
CREATE INDEX IF NOT EXISTS idx_transactions_table ON transactions(table_id);
CREATE INDEX IF NOT EXISTS idx_attendance_staff ON attendance_log(staff_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);
