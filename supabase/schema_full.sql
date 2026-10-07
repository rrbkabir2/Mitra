-- ==============================================================================
-- MITRA DELIVERY CONFIRMATION PLATFORM - FULL PRODUCTION SCHEMA & SEED
-- ==============================================================================
-- Run this in your Supabase SQL Editor to initialize all tables, RLS policies,
-- tamper-proof triggers, vendor-token functions, and initial seed data for Kabir Bundele.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DROP TRIGGER IF EXISTS trigger_enforce_tamper_proof_status ON entries;
DROP FUNCTION IF EXISTS enforce_tamper_proof_status();

-- 1. Households
CREATE TABLE IF NOT EXISTS households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Kabir Bundele',
    language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'hi', 'mr')),
    advanced_mode BOOLEAN NOT NULL DEFAULT false,
    auto_confirm_hours INT NOT NULL DEFAULT 24 CHECK (auto_confirm_hours >= 1),
    daily_reminder_time TIME NOT NULL DEFAULT '09:00:00',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Vendors
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    vendor_type TEXT NOT NULL DEFAULT 'dairy' CHECK (vendor_type IN ('dairy', 'grocery', 'other')),
    access_token TEXT NOT NULL UNIQUE,
    token_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    auto_monthly_report BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendors_household_id ON vendors(household_id);
CREATE INDEX IF NOT EXISTS idx_vendors_access_token ON vendors(access_token);

-- 3. Products
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

-- 4. Entries
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
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'auto-confirmed', 'denied', 'absent')),
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

-- 5. Price Change Requests
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

-- 6. WhatsApp Usage
CREATE TABLE IF NOT EXISTS whatsapp_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    message_count INT NOT NULL DEFAULT 0 CHECK (message_count >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_household_vendor_month UNIQUE(household_id, vendor_id, month)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_usage_month ON whatsapp_usage(household_id, month);

-- 7. Purchase Records
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

-- 8. Reminders Log
CREATE TABLE IF NOT EXISTS reminders_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    reminder_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    entry_logged BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT uq_household_reminder_date UNIQUE(household_id, date)
);

-- 9. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trust Safeguard Trigger
CREATE OR REPLACE FUNCTION enforce_tamper_proof_status()
RETURNS TRIGGER AS $$
BEGIN
    IF auth.role() = 'authenticated' THEN
        IF TG_OP = 'INSERT' AND NEW.status IN ('confirmed', 'auto-confirmed', 'denied') THEN
            RAISE EXCEPTION 'Trust Safeguard Violation: Entries cannot be created with confirmed, auto-confirmed, or denied status by household admin. Status is pending until vendor acts or auto-confirmation elapses.';
        END IF;

        IF TG_OP = 'UPDATE' AND (NEW.status <> OLD.status) AND NEW.status IN ('confirmed', 'auto-confirmed', 'denied') THEN
            RAISE EXCEPTION 'Trust Safeguard Violation: Admins cannot approve or deny delivery entries on vendor behalf. Confirmation is strictly reserved for the vendor via WhatsApp/Tokenized interface or system 24h auto-confirmation.';
        END IF;

        IF TG_OP = 'UPDATE' AND (NEW.status_set_by IS DISTINCT FROM OLD.status_set_by) THEN
            RAISE EXCEPTION 'Trust Safeguard Violation: status_set_by cannot be modified by admin.';
        END IF;
    END IF;

    IF NEW.status = 'confirmed' THEN
        IF NEW.status_set_by IS NULL OR NEW.status_set_by <> 'vendor' THEN
            RAISE EXCEPTION 'Invalid status transition: confirmed status must be set by vendor.';
        END IF;
        IF NEW.status_set_at IS NULL THEN
            NEW.status_set_at := now();
        END IF;
    END IF;

    IF NEW.status = 'auto-confirmed' THEN
        IF NEW.status_set_by IS NULL OR NEW.status_set_by <> 'system_auto' THEN
            RAISE EXCEPTION 'Invalid status transition: auto-confirmed status must be set by system_auto.';
        END IF;
        IF NEW.status_set_at IS NULL THEN
            NEW.status_set_at := now();
        END IF;
    END IF;

    IF NEW.status = 'denied' THEN
        IF NEW.status_set_by IS NULL OR NEW.status_set_by NOT IN ('vendor', 'system_auto') THEN
            RAISE EXCEPTION 'Invalid status transition: denied status must be set by vendor.';
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

-- Row Level Security (RLS)
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view their own household"
    ON households FOR SELECT
    USING (admin_id = auth.uid());

CREATE POLICY "Admins can update their own household"
    ON households FOR UPDATE
    USING (admin_id = auth.uid());

CREATE POLICY "Admins manage household vendors"
    ON vendors FOR ALL
    USING (household_id IN (SELECT id FROM households WHERE admin_id = auth.uid()));

CREATE POLICY "Admins manage household products"
    ON products FOR ALL
    USING (household_id IN (SELECT id FROM households WHERE admin_id = auth.uid()));

CREATE POLICY "Admins view and insert household entries"
    ON entries FOR ALL
    USING (household_id IN (SELECT id FROM households WHERE admin_id = auth.uid()));

CREATE POLICY "Admins manage price requests"
    ON price_change_requests FOR ALL
    USING (household_id IN (SELECT id FROM households WHERE admin_id = auth.uid()));

CREATE POLICY "Admins view whatsapp usage"
    ON whatsapp_usage FOR SELECT
    USING (household_id IN (SELECT id FROM households WHERE admin_id = auth.uid()));

CREATE POLICY "Admins manage purchase records"
    ON purchase_records FOR ALL
    USING (household_id IN (SELECT id FROM households WHERE admin_id = auth.uid()));

CREATE POLICY "Admins view reminders"
    ON reminders_log FOR ALL
    USING (household_id IN (SELECT id FROM households WHERE admin_id = auth.uid()));

CREATE POLICY "Admins view audit logs"
    ON audit_logs FOR SELECT
    USING (household_id IN (SELECT id FROM households WHERE admin_id = auth.uid()));

-- Vendor Token Functions
CREATE OR REPLACE FUNCTION get_vendor_by_token(token_val TEXT)
RETURNS TABLE (
    id UUID,
    household_id UUID,
    name TEXT,
    phone_number TEXT,
    vendor_type TEXT,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT v.id, v.household_id, v.name, v.phone_number, v.vendor_type, v.is_active
    FROM vendors v
    WHERE v.access_token = token_val AND v.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_vendor_entries_by_token(token_val TEXT)
RETURNS SETOF entries AS $$
BEGIN
    RETURN QUERY
    SELECT e.*
    FROM entries e
    JOIN vendors v ON e.vendor_id = v.id
    WHERE v.access_token = token_val AND v.is_active = true
    ORDER BY e.entry_date DESC, e.entry_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION vendor_confirm_or_deny(token_val TEXT, entry_id UUID, new_status TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    target_vendor_id UUID;
BEGIN
    IF new_status NOT IN ('confirmed', 'denied') THEN
        RAISE EXCEPTION 'Invalid status. Vendor can only confirm or deny.';
    END IF;

    SELECT id INTO target_vendor_id FROM vendors WHERE access_token = token_val AND is_active = true;
    IF target_vendor_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or inactive vendor token.';
    END IF;

    UPDATE entries
    SET status = new_status,
        status_set_by = 'vendor',
        status_set_at = now(),
        delivered_confirmed_at = CASE WHEN new_status = 'confirmed' THEN now() ELSE delivered_confirmed_at END
    WHERE id = entry_id AND vendor_id = target_vendor_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
