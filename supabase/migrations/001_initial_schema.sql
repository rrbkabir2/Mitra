-- ==============================================================================
-- MITRA DELIVERY CONFIRMATION PLATFORM - DATABASE SCHEMA & TRUST SAFEGUARDS
-- Core Principle: Tamper-proof, jointly confirmed daily records between household & vendors.
-- WhatsApp is primary vendor channel; vendor never logs in. Admin uses full web app.
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Clean teardown for migrations if recreating
DROP TRIGGER IF EXISTS trigger_enforce_tamper_proof_status ON entries;
DROP FUNCTION IF EXISTS enforce_tamper_proof_status();

-- ------------------------------------------------------------------------------
-- Table: households
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'My Household',
    language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'hi', 'mr')),
    advanced_mode BOOLEAN NOT NULL DEFAULT false,
    auto_confirm_hours INT NOT NULL DEFAULT 24 CHECK (auto_confirm_hours >= 1),
    daily_reminder_time TIME NOT NULL DEFAULT '09:00:00',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- Table: vendors
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    vendor_type TEXT NOT NULL DEFAULT 'dairy' CHECK (vendor_type IN ('dairy', 'grocery', 'other')),
    access_token TEXT NOT NULL UNIQUE,
    token_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendors_household_id ON vendors(household_id);
CREATE INDEX IF NOT EXISTS idx_vendors_access_token ON vendors(access_token);

-- ------------------------------------------------------------------------------
-- Table: products
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    unit_type TEXT NOT NULL DEFAULT 'litre' CHECK (unit_type IN ('litre', 'kilogram', 'count')),
    default_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (default_price >= 0),
    photo_url TEXT,
    is_milk_type BOOLEAN NOT NULL DEFAULT false,
    milk_subtype TEXT CHECK (milk_subtype IN ('cow', 'buffalo', NULL)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_household_id ON products(household_id);
CREATE INDEX IF NOT EXISTS idx_products_vendor_id ON products(vendor_id);

-- ------------------------------------------------------------------------------
-- Table: entries
-- Core daily delivery log
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity NUMERIC(6, 2) NOT NULL DEFAULT 0.00 CHECK (quantity >= 0),
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (unit_price >= 0),
    total_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_price >= 0),
    extra_items JSONB DEFAULT '[]'::jsonb,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    entry_time TIME NOT NULL DEFAULT CURRENT_TIME,
    photo_url TEXT,
    photo_deleted_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'denied', 'absent')),
    status_set_by TEXT CHECK (status_set_by IN ('vendor', 'system_auto', NULL)),
    status_set_at TIMESTAMPTZ,
    whatsapp_message_id TEXT,
    delivered_confirmed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entries_household_date ON entries(household_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_entries_vendor_date ON entries(vendor_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_entries_status ON entries(status);

-- ------------------------------------------------------------------------------
-- Table: price_change_requests
-- Admin can request price change; only takes effect after vendor approval
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS price_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    old_price NUMERIC(10, 2) NOT NULL CHECK (old_price >= 0),
    new_price NUMERIC(10, 2) NOT NULL CHECK (new_price >= 0),
    requested_by_admin UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_price_change_vendor ON price_change_requests(vendor_id, status);

-- ------------------------------------------------------------------------------
-- Table: whatsapp_usage
-- Free tier tracking (1,000 free service messages/month) and prediction
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    month TEXT NOT NULL, -- Format: YYYY-MM
    message_count INT NOT NULL DEFAULT 0 CHECK (message_count >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_household_vendor_month UNIQUE(household_id, vendor_id, month)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_usage_month ON whatsapp_usage(household_id, month);

-- ------------------------------------------------------------------------------
-- Table: purchase_records
-- One-time purchases for non-recurring items (e.g. ghee, butter, paneer, groceries)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
    product_name TEXT NOT NULL,
    photo_url TEXT,
    quantity NUMERIC(6, 2) NOT NULL DEFAULT 1.00 CHECK (quantity > 0),
    total_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_price >= 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- Table: reminders_log
-- Track daily reminder nudge to ensure no silently missing day
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reminders_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    reminder_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    entry_logged BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT uq_household_reminder_date UNIQUE(household_id, date)
);

-- ------------------------------------------------------------------------------
-- Table: audit_logs
-- Immutable tamper-proof ledger for security events
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    actor TEXT NOT NULL, -- 'admin', 'vendor', 'system_auto', 'webhook'
    details JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- TRUST SAFEGUARD TRIGGER: Database-level tamper-proofing
-- Admins cannot set entry status to 'confirmed' or 'denied'.
-- Approve and Deny belongs exclusively to vendor or system_auto.
-- ==============================================================================
CREATE OR REPLACE FUNCTION enforce_tamper_proof_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If caller is authenticated user (the household admin session)
    IF auth.role() = 'authenticated' THEN
        -- Prevent admin from creating directly confirmed or denied entries
        IF TG_OP = 'INSERT' AND NEW.status IN ('confirmed', 'denied') THEN
            RAISE EXCEPTION 'Trust Safeguard Violation: Entries cannot be created with confirmed or denied status by household admin. Status is pending until vendor acts.';
        END IF;

        -- Prevent admin from updating status to confirmed or denied
        IF TG_OP = 'UPDATE' AND (NEW.status <> OLD.status) AND NEW.status IN ('confirmed', 'denied') THEN
            RAISE EXCEPTION 'Trust Safeguard Violation: Admins cannot approve or deny delivery entries on vendor behalf. Confirmation is strictly reserved for the vendor via WhatsApp/Tokenized interface.';
        END IF;

        -- Prevent admin from altering status_set_by
        IF TG_OP = 'UPDATE' AND (NEW.status_set_by IS DISTINCT FROM OLD.status_set_by) THEN
            RAISE EXCEPTION 'Trust Safeguard Violation: status_set_by cannot be modified by admin.';
        END IF;
    END IF;

    -- Generic invariant: confirmed/denied must have status_set_by set to vendor or system_auto
    IF NEW.status IN ('confirmed', 'denied') THEN
        IF NEW.status_set_by IS NULL OR NEW.status_set_by NOT IN ('vendor', 'system_auto') THEN
            RAISE EXCEPTION 'Invalid status transition: status_set_by must be vendor or system_auto.';
        END IF;
        IF NEW.status_set_at IS NULL THEN
            NEW.status_set_at := now();
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_enforce_tamper_proof_status
BEFORE INSERT OR UPDATE ON entries
FOR EACH ROW
EXECUTE FUNCTION enforce_tamper_proof_status();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Households: admin can view & update their own household
CREATE POLICY "Admins can view their own household"
    ON households FOR SELECT
    USING (admin_id = auth.uid());

CREATE POLICY "Admins can update their own household"
    ON households FOR UPDATE
    USING (admin_id = auth.uid());

-- Vendors: admin can view and manage their vendors
CREATE POLICY "Admins manage household vendors"
    ON vendors FOR ALL
    USING (household_id IN (SELECT id FROM households WHERE admin_id = auth.uid()));

-- Products: admin can view and manage products
CREATE POLICY "Admins manage household products"
    ON products FOR ALL
    USING (household_id IN (SELECT id FROM households WHERE admin_id = auth.uid()));

-- Entries: admin can select, insert, update (governed by trigger)
CREATE POLICY "Admins view and insert household entries"
    ON entries FOR ALL
    USING (household_id IN (SELECT id FROM households WHERE admin_id = auth.uid()));

-- Price change requests: admin can view and insert
CREATE POLICY "Admins manage price requests"
    ON price_change_requests FOR ALL
    USING (household_id IN (SELECT id FROM households WHERE admin_id = auth.uid()));

-- WhatsApp usage: admin can view
CREATE POLICY "Admins view whatsapp usage"
    ON whatsapp_usage FOR SELECT
    USING (household_id IN (SELECT id FROM households WHERE admin_id = auth.uid()));

-- Purchases: admin can view & insert
CREATE POLICY "Admins manage purchase records"
    ON purchase_records FOR ALL
    USING (household_id IN (SELECT id FROM households WHERE admin_id = auth.uid()));

-- Reminders log: admin can view
CREATE POLICY "Admins view reminders"
    ON reminders_log FOR ALL
    USING (household_id IN (SELECT id FROM households WHERE admin_id = auth.uid()));

-- Audit logs: admin can read their logs
CREATE POLICY "Admins view audit logs"
    ON audit_logs FOR SELECT
    USING (household_id IN (SELECT id FROM households WHERE admin_id = auth.uid()));
