# 🥛 MITRA — MASTER FINAL SPECIFICATION & PROMPT
### Complete System Blueprint for 100% Scratch Rebuild

> **Master Directive for AI Coding Tools & Engineers:**
> This document is the single, authoritative, and complete specification for the **Mitra Delivery Confirmation Platform**.
> It specifies every architecture pattern, feature, screen, database schema, security policy, messaging gateway, packaging step, and 55 historic platform fixes. Pasting this specification into an AI coding tool or providing it to a software engineer will allow them to rebuild the entire application from zero with identical functionality, pixel-perfect design, and zero ambiguity.
> **Security Note:** All secrets, passwords, API keys, names, and contact details in this document are strictly generic placeholders (e.g., `admin@example.com`, `+919876543210`, `https://your-project.supabase.co`).

---

## 1. Executive Summary & Core Philosophy

### 1.1 The Dispute Problem in Daily Household Deliveries
In India and across developing markets, millions of households receive fresh milk, dairy products, bread, and groceries daily from local, unorganized vendors. These transactions occur informally:
- Milk packets or canisters are delivered to doorsteps or hung in bags at 6:00 AM – 7:30 AM.
- Quantities fluctuate daily based on household needs (e.g., extra curd or milk on festival days, 0 litres during family travel).
- Disagreements inevitably arise at the end of every calendar month over exact quantities received, absent days, and net payments owed.
- Traditional accounting apps fail because they require vendors to install apps, remember passwords, or navigate complex smartphone interfaces they do not understand or trust.

### 1.2 The Mitra Breakthrough: Zero-Friction Vendor Trust Layer
Mitra resolves this trust problem permanently by establishing a **tamper-proof, verifiable daily trust layer** between households and vendors governed by five non-negotiable principles:

1. **Zero Login / Zero App for the Vendor**:
   - The delivery person **never creates an account**, **never enters a password**, and **never installs an app**.
   - Every morning, the household logs the arrival in 3 seconds. The vendor receives a neutral, transparent notification across active messaging channels (WhatsApp, SMS, or direct phone dispatch).
   - The message contains a link to their private, read-only tokenized portal: `https://your-domain.com/v/{32-byte-token}`.
2. **Admins Cannot Tamper with Vendor Records (Core Trust Guarantee)**:
   - The status of an entry (`pending`, `confirmed`, `auto-confirmed`, `denied`, `absent`) can **never** be unilaterally altered to `confirmed` or `denied` by the household admin.
   - Confirmation is strictly reserved for the vendor or an automated 24-hour timeout trigger.
   - Enforced at both the API layer and the PostgreSQL database trigger layer (`enforce_tamper_proof_status`). Any attempt by an admin session to forge a vendor confirmation raises an uncatchable database exception and triggers an immediate transaction rollback.
3. **Transparent Correction Trail**:
   - Deliveries cannot be silently altered. If a household admin makes a mistake, any edit creates an immutable audit trail with correction reasons, timestamps, and previous values, automatically dispatching a **Correction Notice** to the vendor.
   - Deleted entries leave a visible replacement marker (**Corrected Entry**) to eliminate month-end reconciliation surprises.
4. **Dispute Resolution via Direct Phone Call**:
   - Instead of fragile, text-based dispute chats, any disagreement displays a prominent 1-tap **"Call Household"** button (`tel:+91...`) on the vendor's portal, encouraging direct verbal clarity.
5. **24-Hour Timeout Auto-Confirmation**:
   - If an entry is delivered and the vendor does not raise a dispute within 24 hours, the system marks the record as `auto-confirmed` with `status_set_by = 'system_auto'`. The UI explicitly displays "Auto-confirmed (no dispute within 24h)" to distinguish it from affirmative vendor confirmations.

---

## 2. Technology Stack & System Architecture

| Architecture Layer | Technology | Version / Spec | Justification |
| :--- | :--- | :--- | :--- |
| **Full-Stack Framework** | **Next.js (App Router)** | `15.1.7+` | Unified server/client architecture, edge API routes, React Server Components, server actions, route handlers for webhooks, and automatic asset optimization. |
| **Language & Typings** | **TypeScript** | `5.7+` | Strict type safety across financial calculations, audit log structures, database models, and messaging payloads. |
| **UI Components & Icons** | **React & Lucide React** | `React 19`, `lucide-react 0.475+` | Modern functional component model, fast client-side reactivity, and consistent SVG icon system. |
| **Styling & Design System** | **Vanilla CSS Tokens** | Pure Custom CSS | Zero heavy CSS framework runtime overhead (no Tailwind), custom glassmorphism, responsive 3x2 quantity grid, HSL-tailored forest green theme (`#183d2d`), and senior-friendly accessibility scales. |
| **Primary Database & Auth** | **Supabase (PostgreSQL 15)** | `@supabase/supabase-js 2.49+` | Enterprise relational database with Row Level Security (RLS), ACID transactions, custom plpgsql triggers, and Supabase Auth with Google OAuth & Email OTP. |
| **Secondary Backup Mirror** | **MongoDB Atlas Cluster** | `mongodb 7.7+` | Real-time dual-write mirroring on every insert/update/delete. Provides instant disaster recovery via `npm run restore:mongo`. |
| **Messaging Channel A** | **Meta WhatsApp Cloud API** | Graph API `v21.0` | Automated delivery receipts, interactive template buttons (`APPROVE_{id}` / `DENY_{id}`), and webhook HMAC-SHA256 signature verification. First 1,000 monthly service messages free. |
| **Messaging Channel B** | **Fast2SMS Transactional** | Quick SMS API | Low-cost Indian SMS gateway (~₹0.25/SMS) delivering instantly to any basic mobile phone without Meta app verification. |
| **Messaging Channel C** | **Personal Phone 1-Tap** | Universal `wa.me` & App Intent | 100% free channel opening the user's phone WhatsApp application with pre-formatted text and image links in 1 tap with zero typing. |
| **Mobile Packaging** | **Android Release APK + PWA** | APK v1.0.0 (API 26+) | Installable standalone Android APK (~7.2 MB) with binary manifest, adaptive vector milk-bottle logo, Java jarsigner v1/v2/v3 signatures, and zero-background battery drain guarantee. |
| **Localization (i18n)** | **Custom Context Engine** | `en`, `hi`, `mr` | Instant full-UI translations across English, Hindi (हिंदी), and Marathi (मराठी) stored in browser `localStorage`. |

---

## 3. Complete Database Schema & PostgreSQL Triggers

Run the following SQL script in Supabase SQL Editor to initialize all tables, indexes, triggers, token functions, and RLS policies.

```sql
-- ==============================================================================
-- MITRA DELIVERY CONFIRMATION PLATFORM - MASTER PRODUCTION SCHEMA
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. HOUSEHOLDS TABLE
CREATE TABLE IF NOT EXISTS households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Household Admin',
    language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'hi', 'mr')),
    advanced_mode BOOLEAN NOT NULL DEFAULT false,
    auto_confirm_hours INT NOT NULL DEFAULT 24 CHECK (auto_confirm_hours >= 1),
    daily_reminder_time TIME NOT NULL DEFAULT '09:00:00',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. ADMINS TABLE (Authorized household administrators)
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL DEFAULT 'Household Admin',
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_household ON admins(household_id);

-- 3. VENDORS TABLE
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

-- 4. PRODUCTS TABLE
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

-- 5. ENTRIES TABLE (Immutable Daily Delivery Ledger)
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

-- 6. PRICE CHANGE REQUESTS TABLE
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

-- 7. WHATSAPP USAGE TRACKER TABLE
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

-- 8. PURCHASE RECORDS TABLE (One-time miscellaneous purchases)
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

-- 9. REMINDERS LOG TABLE
CREATE TABLE IF NOT EXISTS reminders_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    reminder_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    entry_logged BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT uq_household_reminder_date UNIQUE(household_id, date)
);

-- 10. AUDIT LOGS TABLE
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

-- ==============================================================================
-- TRUST SAFEGUARD POSTGRESQL TRIGGER: ENFORCE TAMPER-PROOF STATUS
-- ==============================================================================
CREATE OR REPLACE FUNCTION enforce_tamper_proof_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Safeguard A: Authenticated household admins cannot forge confirmations
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

    -- Safeguard B: Status transition integrity
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

DROP TRIGGER IF EXISTS trigger_enforce_tamper_proof_status ON entries;
CREATE TRIGGER trigger_enforce_tamper_proof_status
BEFORE INSERT OR UPDATE ON entries
FOR EACH ROW
EXECUTE FUNCTION enforce_tamper_proof_status();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view their own household" ON households FOR SELECT USING (admin_id = auth.uid());
CREATE POLICY "Admins update their own household" ON households FOR UPDATE USING (admin_id = auth.uid());
CREATE POLICY "Admins manage admins" ON admins FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage vendors" ON vendors FOR ALL USING (household_id IN (SELECT id FROM households WHERE admin_id = auth.uid()));
CREATE POLICY "Admins manage products" ON products FOR ALL USING (household_id IN (SELECT id FROM households WHERE admin_id = auth.uid()));
CREATE POLICY "Admins manage entries" ON entries FOR ALL USING (household_id IN (SELECT id FROM households WHERE admin_id = auth.uid()));
CREATE POLICY "Admins manage price requests" ON price_change_requests FOR ALL USING (household_id IN (SELECT id FROM households WHERE admin_id = auth.uid()));
CREATE POLICY "Admins view whatsapp usage" ON whatsapp_usage FOR SELECT USING (household_id IN (SELECT id FROM households WHERE admin_id = auth.uid()));
CREATE POLICY "Admins manage purchases" ON purchase_records FOR ALL USING (household_id IN (SELECT id FROM households WHERE admin_id = auth.uid()));
CREATE POLICY "Admins view reminders" ON reminders_log FOR ALL USING (household_id IN (SELECT id FROM households WHERE admin_id = auth.uid()));
CREATE POLICY "Admins view audit logs" ON audit_logs FOR SELECT USING (household_id IN (SELECT id FROM households WHERE admin_id = auth.uid()));

-- ==============================================================================
-- CRYPTOGRAPHIC TOKEN VENDOR SECURITY FUNCTIONS
-- ==============================================================================
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
```

---

## 4. Security, Authentication, and Session Lifecycle

### 4.1 Admin Authentication Architecture
- **Zero Public Sign-Up**: The public cannot register new accounts. There is no sign-up link anywhere in the UI or routing.
- **Database Single Source of Truth**: Authorized administrators are stored directly in the `admins` table. The application queries `admins` in real-time, removing any need for hardcoded email environment variables.
- **Email Allow-List Validation**: When an admin attempts login with email/password or Google OAuth, the system verifies that the email exists in the `admins` table. Unauthorized logins are rejected with a generic message: `"Access restricted to pre-approved household administrators."`
- **OTP Password Reset**: The login screen features a "Forgot Password?" trigger allowing authorized admins to request a 6-digit one-time password (OTP) sent to their verified email to securely reset credentials.

### 4.2 Browser vs. Installed Device Session Expiry (Point 34)
- **Web Browser Inactivity Expiry (60 Minutes)**:
  - When accessed on shared, borrowed, or desktop browsers, sessions automatically terminate after **60 minutes of inactivity** or when the browser/tab is closed.
  - Browser autofill and credential caching are explicitly disabled (`autoComplete="new-password"`, `spellCheck={false}`) so fields load completely blank on shared computers.
- **Installed Android App & PWA Persistent Session (180 Days)**:
  - On personal Android devices running the Mitra APK or added to the home screen as a PWA (detected via `window.matchMedia('(display-mode: standalone)')` or Android WebView user agents), the session duration extends to **180 days**, providing seamless instant launch without repeated logins.

### 4.3 Automated Supabase Keep-Alive (Free-Tier Pause Prevention)
- **The Problem**: Supabase free-tier projects automatically pause after 7 days of database inactivity, breaking daily household morning logging.
- **The Solution**: 
  - An edge route [`/api/keep-alive`](file:///src/app/api/keep-alive/route.ts) executes a lightweight read transaction (`SELECT id, name FROM households LIMIT 1`) against Supabase.
  - A zero-cost GitHub Actions workflow (`.github/workflows/supabase-keep-alive.yml`) runs every 2 days on a cron schedule (`0 4 */2 * *`), resetting the Supabase inactivity timer permanently.

### 4.4 Secondary MongoDB Atlas Mirroring & 1-Command Disaster Recovery
- Every write in Mitra (new deliveries, edits, deletions, price updates, products, purchases) is dual-written asynchronously to a MongoDB Atlas cluster via `/api/backup/mirror`.
- If Supabase ever undergoes scheduled maintenance or accidental row deletion, running:
  ```bash
  npm run restore:mongo
  ```
  queries MongoDB Atlas collections and restores all data back into PostgreSQL with zero downtime.

---

## 5. Every Page, Screen, and User Interface Component

### 5.1 Main Layout & Navigation Hierarchy
- **Header (`Header.tsx`)**:
  - Displays the Mitra milk-bottle SVG logo, wordmark, and household label.
  - Right side features the active language switcher (`EN`, `HI`, `MR`), current date display, and admin profile trigger.
- **Mobile Navigation Bar (`MobileNav.tsx` - Point 53)**:
  - Fixed at the bottom of the viewport on mobile devices (hidden on login screen and `/v/{token}` portal).
  - Main 5 tabs:
    1. **Home** (`/`) — Milk Bottle / Home Icon
    2. **History** (`/history`) — ListOrdered Icon
    3. **Report** (`/reports`) — BarChart3 Icon
    4. **Settings** (`/settings`) — Settings Icon
    5. **More** (triggers slide-up navigation sheet) — MoreHorizontal Icon
  - **"More" Slide-Up Sheet Grid**:
    1. **Send Purchase** (`/send-purchase`) — ShoppingBag Icon
    2. **Vendors & Products** (`/products-vendors`) — Users Icon
    3. **Rate & Pricing** (`/pricing`) — IndianRupee Icon
    4. **Channel Usage** (`/whatsapp-usage`) — MessageSquare Icon
    5. **Logout Button** — LogOut Icon

---

### 5.2 Screen 1: Home / Today (`/`)
- **Today's Milk Banner**: Formatted current day, date, and greeting.
- **Milk Variety Toggle**: Quick switch between **Cow Milk (गाय का दूध)** and **Buffalo Milk (भैंस का दूध)** with real-time rate display per litre.
- **Canonical 3x2 Quantity Grid**:
  - `0.5 L` — Half Litre
  - `1.0 L` — Standard Litre
  - `1.5 L` — 1.5 Litres
  - `2.0 L` — 2 Litres
  - `2+ L` — Custom stepper with clean number input (no spinner arrows, no stuck zeros)
  - `Absent` — One-tap trigger marking 0 Litres and dispatching an absence alert
- **Quick Entry Modal**:
  - Pre-filled with selected quantity, delivery time, and calculated total amount.
  - **Collapsed Extra Items Button (`+ Extra Items`)**: Clean and tucked away by default so daily logging takes under 3 seconds. Tapping it expands the catalog quick-pick carousel (Dahi, Paneer) and "+ Type New Product" creator.
  - **Vendor Selection for Extras (Point 51)**: Extra items allow selecting which vendor supplied them, attributing costs accurately in the ledger.
  - **Camera Proof Attachment**: Inline camera trigger with client-side HTML5 canvas compression (<150KB) reducing uploads by 95%.
  - Notes field for doorstep instructions.
- **Dispute-Safe Notification Toast**:
  - When an entry is saved, a floating alert confirms multi-channel dispatch.
  - Features the **"Open WhatsApp (1-Tap Send)"** button for instant personal phone dispatch.
- **Inline Correction & Detail Modal**: Tapping any recorded card opens the full proof modal with photo attachment, audit timestamps, inline quantity editing with mandatory correction reason, and deletion with vendor re-notification.

---

### 5.3 Screen 2: Delivery History (`/history`)
- **Unified Filter Bar**:
  - Timeframe pills: **Today**, **Month**, **Year**, **Custom Date Range (From/To)**, and **Full Ledger (All)**.
  - **Vendor Dropdown**: Filter by individual vendor (e.g. Ramesh Patil Dairy, Kisan Fresh Groceries) or view all combined.
  - **Status Filter**: Pending, Confirmed, Auto-Confirmed, Denied, Absent.
- **Filtered Export & Print Statement (Points 38 & 39)**:
  - **Download Statement (`.txt`)**: Generates an export file reflecting the exact active filters (date range, vendor name, status) clearly labeled in the header.
  - **Print / Save as PDF**: Opens a clean printer-friendly stylesheet hiding navigation bars and buttons.
- **Immutable Ledger Cards**: Displays date, delivery time, vendor, product, quantity, unit price, extra items breakdown, total, and read-only status badges.

---

### 5.4 Screen 3: Rate & Pricing (`/pricing`)
- **Active Milk Rates**: Current rate per litre for Cow Milk and Buffalo Milk.
- **Propose Price Change Card**:
  - Select vendor and milk variety, input new rate per litre.
  - **Trust Safeguard Callout**: Warns that price adjustments cannot be applied retroactively to past confirmed records and require vendor notification before activation.
- **Price Change Audit History**: Tabular log of past price revisions with request date, old price, new price, and status.

---

### 5.5 Screen 4: Monthly Reports & Invoicing (`/reports`)
- **Month Selector**: Dropdown spanning historical months.
- **Aggregated Financial Cards**:
  - Total Volume (Litres)
  - Net Expenditure (₹)
  - Confirmed vs. Auto-Confirmed vs. Pending vs. Absent delivery count breakdown.
- **Automated Month-End Vendor Statement Toggle (Point 7)**:
  - Per-vendor toggle allowing automatic dispatch of month-end billing summaries via WhatsApp/SMS.
- **Invoice Export Buttons**: 1-click **Download Plain Text Invoice** and **Print / PDF Invoice**.

---

### 5.6 Screen 5: Vendors & Products Management (`/products-vendors`)
- **Vendor Directory**:
  - List of registered vendors with phone number, vendor type (Dairy, Grocery, Other), and active status toggle.
  - **Cryptographic Access Token Management**: View vendor's private portal URL (`/v/{token}`), copy link, and 1-click **Rotate / Revoke Token** if a link is ever compromised.
- **Product Catalog**:
  - Manage master products with default rate and unit types (`litre`, `kilogram`, `count`).
  - Add new products to the catalog with unit prices.

---

### 5.7 Screen 6: Send One-Time Purchase (`/send-purchase`)
- Form designed for non-daily, one-time grocery or farm purchases (e.g. 5kg Basmati Rice, 500g Ghee, 1kg Honey).
- **Product Catalog Dropdown (Point 28)**: Select existing catalog products with auto-filled rates alongside a "+ Type New Product" free-form creator.
- **Multi-Channel Dispatch**: Dispatches the purchase notification simultaneously across all active messaging channels (WhatsApp Cloud API, Fast2SMS, Personal Phone 1-tap).
- Photo attachment support with client-side image compression.

---

### 5.8 Screen 7: Messaging & Channel Usage (`/whatsapp-usage`)
- **Channel Switcher Pill Bar**: Multi-select pills enabling or disabling WhatsApp Business API, Fast2SMS Gateway, and Personal Phone channels.
- **Three Independent Side-by-Side Trackers**:
  1. **Official WhatsApp Business Cloud API**: Live counter against Meta's 1,000 free monthly service conversations with pacing projections.
  2. **Fast2SMS Transactional Gateway**: Counter with live Indian Rupee expenditure calculations (~₹0.25/SMS).
  3. **Personal Phone 1-Tap Channel (Point 52)**: Tracks 1-tap dispatches launched with an explanatory banner clarifying that private WhatsApp messages handle delivery receipts directly inside WhatsApp.
- **Dispatch Audit Logs**: Real-time table logging every outgoing message with timestamp, recipient phone, gateway, cost, and delivery receipt status.
- **Built-In Webhook Simulator**: Developer testing tool to simulate incoming vendor approval callbacks (`APPROVE_{id}` / `DENY_{id}`) without needing a live Meta webhook.

---

### 5.9 Screen 8: Settings & Security (`/settings`)
- **Adjustable Font Size & Senior Accessibility (Point 41)**: Aa buttons (`Small [14px]`, `Default [16px]`, `Large [18px]`, `Extra Large [20px]`) instantly scaling typography across the app and persisting in `localStorage`.
- **Language Switcher**: English, Hindi (हिंदी), Marathi (मराठी).
- **Auto-Confirm Window**: Clean number input configuring the timeout duration (default: 24 hours).
- **Daily Reminder Time**: Configurable time picker (default: 09:00 AM) for doorstep milk logging reminders.
- **Photo Storage Cleanup**: One-tap cleanup pruning photos older than 30 days while permanently retaining the delivery ledger rows in PostgreSQL.
- **Administrator Accounts & Database Management (Point 42 & 43)**: In-app management to add or delete authorized admin emails with temporary passwords, with browser autofill disabled.
- **Sample Delivery History Seeder (Point 54)**: Explanatory note referencing `supabase/sample_delivery_seed.sql` for manual execution in the Supabase SQL Editor.
- **Delete All Data Button (Point 55)**: Red destructive action button with confirmation modal that wipes only operational delivery entries, purchases, and channel logs while strictly preserving administrator accounts, login credentials, and household settings.
- **Android APK Download Card**: Download link for `mitra-v1.0.apk` with zero-background battery policy notice.

---

### 5.10 Screen 9: Vendor Public Read-Only Portal (`/v/{token}`)
- Mobile-optimized, ultra-lightweight page accessed via the vendor's private 32-byte token without passwords or logins.
- Displays today's delivery details (quantity, price, photo proof) and monthly delivery summary.
- **1-Tap "Call Household" Dispute Card**: Direct `tel:+91...` phone call button for instant verbal clarification.
- Deep-linkable proof view for individual deliveries: `/v/{token}/proof/{entryId}`.

---

### 5.11 Screen 10: Admin Authentication (`/login`)
- Clean, minimal login screen displaying the Mitra milk-bottle logo, language switcher, and authentication box.
- Generic placeholder (`admin@example.com`), password visibility toggle, autofill disabled.
- Google Sign-In with direct account selection prompt (`prompt=select_account`).
- Email OTP password reset modal for verified administrators.

---

## 6. Messaging Channels & Dispatch Engine

### 6.1 Channel A: Meta WhatsApp Business Cloud API
- **Endpoint**: `https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages`
- **Authentication**: System User permanent access token (`Bearer {WHATSAPP_ACCESS_TOKEN}`).
- **Template & Message Format**: Sends neutral delivery details with interactive buttons:
  - Button 1: `APPROVE_{entry_id}` (label: "Confirm Delivery")
  - Button 2: `DENY_{entry_id}` (label: "Dispute Delivery")
- **Webhook Processing (`/api/whatsapp/webhook`)**:
  - Handles `GET` challenge verification with `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
  - Handles `POST` callbacks with HMAC-SHA256 signature verification via `X-Hub-Signature-256` using `WHATSAPP_APP_SECRET`.
  - Automatically updates entry status to `confirmed` or `denied` with `status_set_by = 'vendor'` when a button is tapped.

### 6.2 Channel B: Fast2SMS Transactional Gateway
- **Endpoint**: `https://www.fast2sms.com/dev/bulkV2`
- **Authentication**: Header `authorization: {FAST2SMS_API_KEY}`
- **Payload**:
  ```json
  {
    "route": "q",
    "message": "Mitra Delivery: 1.5L Cow Milk recorded for today. Total: Rs 90. View ledger: https://your-domain.com/v/sample_token",
    "language": "english",
    "flash": 0,
    "numbers": "9876543210"
  }
  ```
- **Cost**: ~₹0.25 per message, logged into `whatsapp_usage` audit tracker.

### 6.3 Channel C: Personal Phone 1-Tap Channel (Point 52)
- **Zero API Cost & Universal Compatibility**:
  - Generates official Meta universal links: `https://wa.me/{phone}?text={encodedText}`.
  - Automatically normalizes Indian phone numbers: adds country code `91` if 10 digits are provided, trims leading zeros.
  - On mobile/Android devices, triggers the native `whatsapp://send?phone=...` app intent directly, avoiding web redirect fetching screens.
- **Accurate Dispatch Tracking (Point 52)**:
  - Does **NOT** increment usage counters during link preparation.
  - Counter increments **only** when the user taps "Open WhatsApp (1-Tap Send)" on screen.
  - Displayed in Channel Usage dashboard as **"1-tap dispatches launched"** with an explanatory note that private WhatsApp chats handle delivery status inside WhatsApp.

---

## 7. Android APK Build & Packaging Process

The standalone Android APK is packaged using native Android toolchains without heavy Cordova/Capacitor frameworks.

```
scripts/
├── apk_src/                      # Decompiled Android WebView template
│   ├── AndroidManifest.xml       # App declaration, permissions, and launcher intent
│   ├── assets/settings.json      # WebView settings, host matching, and skip rules
│   └── res/                      # Mipmap densities and vector drawables
├── build_mitra_apk.py            # Master Python build, signing, and verification script
├── render_icons.py               # Generates density-scaled icons from master SVG
├── mitra-release.keystore        # 2048-bit RSA release keystore
└── tools/
    ├── aapt2.exe                 # Official Google Android Asset Packaging Tool 2
    ├── apktool.jar               # Apktool 2.10.0 resource compiler
    └── uber-apk-signer.jar       # v1, v2, v3 cryptographic Android APK signer
```

### 7.1 WebView Intent & Delegation Configuration (`assets/settings.json`)
```json
{
  "sites": [{ "url": "https://your-domain.com/", "title": "Mitra" }],
  "other": "https://your-domain.com/",
  "match": [
    ["host", "equals", "your-domain.com"],
    ["host", "endsWith", "vercel.app"],
    ["host", "endsWith", "supabase.co"],
    ["host", "endsWith", "google.com"]
  ],
  "skip": [
    ["path", "endsWith", ".apk"],
    ["path", "endsWith", ".pdf"],
    ["path", "endsWith", ".txt"],
    ["path", "contains", "/downloads/"],
    ["path", "contains", "/api/reports/download"],
    ["host", "endsWith", "whatsapp.com"],
    ["host", "equals", "wa.me"],
    ["url", "startsWith", "whatsapp:"],
    ["url", "startsWith", "tel:"],
    ["url", "startsWith", "sms:"],
    ["url", "startsWith", "mailto:"]
  ],
  "not_matching": true,
  "web_settings": {
    "JavaScriptEnabled": true,
    "DomStorageEnabled": true,
    "DatabaseEnabled": true
  }
}
```

### 7.2 APK Packaging Commands
```bash
# 1. Build and sign release APK
python scripts/build_mitra_apk.py

# Internal operations executed by build script:
# a) Downsamples master milk-bottle SVG into mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi
# b) Compiles resources and bytecode:
java -jar tools/apktool.jar b scripts/apk_src -o scripts/mitra-unsigned.apk --use-aapt2 --aapt tools/aapt2.exe
# c) Zipaligns and signs with release keystore (v1, v2, v3 Android signature schemes):
java -jar tools/uber-apk-signer.jar -a scripts/mitra-signed.apk --ks scripts/mitra-release.keystore --ksAlias mitra --ksPass generic_pass --allowResign --overwrite
# d) Deploys verified APK to: public/downloads/mitra-v1.1.apk
```

---

## 8. Complete Chronological Development Fix Log (Points 1 – 76)

The following 76 engineering fixes and enhancements represent the complete development history of Mitra.

1. **Brand Wordmark & Household Identity**: Replaced generic headers with the custom Mitra milk-bottle emblem and dynamic household name.
2. **Strict Admin Authentication Gating**: Protected all operational views and API routes behind verified admin session cookies.
3. **Database Single Source of Truth for Admins**: Eliminated hardcoded email environment variables; authorizations query the `admins` table.
4. **Non-Negotiable Tamper-Proof Status Trigger**: Implemented PostgreSQL trigger `enforce_tamper_proof_status` preventing admins from forging vendor confirmations.
5. **Distinct Auto-Confirmed Status & Badging**: Separated affirmative vendor confirmations from 24-hour timeout auto-confirmations.
6. **Clean Number Input Sanitization**: Eliminated spinner arrows, wheel-scrolling accidental jumps, and stuck leading zeros on quantity inputs.
7. **Per-Vendor Monthly Report Auto-Send Toggle**: Added granular per-vendor toggles for month-end WhatsApp/SMS statement dispatch.
8. **Client-Side Canvas Photo Compression**: Reduced photo upload sizes from 4MB to <150KB via HTML5 canvas downsampling.
9. **Global Offline Banner**: Added reactive `navigator.onLine` detector warning admins during connection drops.
10. **Storage Lifecycle Management**: Created `/api/storage/cleanup` to prune settled photo binaries older than 30 days while permanently preserving ledger entries.
11. **Three Swappable Messaging Gateways**: Added WhatsApp Cloud API, Fast2SMS, and Personal Phone 1-tap channels with multi-select.
12. **Split Channel Usage Trackers**: Created independent meters for Meta conversations, Fast2SMS rupee expenditure, and Personal Phone dispatches.
13. **Real-Time Dual-Database Mirroring**: Connected MongoDB Atlas dual-write mirroring for disaster resilience.
14. **1-Command Database Restore**: Built `npm run restore:mongo` to restore Supabase from MongoDB in emergencies.
15. **Vendor Portal Call Household Dispute Card**: Replaced chat dispute buttons on `/v/{token}` with a direct `tel:+91...` voice call button.
16. **32-Byte Cryptographic Vendor Token Rotation**: Added instant token rotation and revocation in the Vendors dashboard.
17. **Automated Supabase Keep-Alive Cron**: Configured edge ping endpoint and GitHub Actions workflow running every 2 days to prevent 7-day free-tier pause.
18. **Downloadable Android Release APK**: Packaged official signed APK with zero background battery execution guarantee.
19. **Hydration Mismatch Fix**: Deferred client `localStorage` loading until after React hydration.
20. **Sign-In Navigation Deadlock Resolution**: Resolved auth redirect stuck state with non-blocking session synchronization.
21. **In-App Administrator Management**: Built an admin management panel in Settings to add and revoke admin accounts.
22. **5-Month Realistic Sample History Seeder**: Generated realistic sample history across multiple vendors from June through October 2026.
23. **Extra Items Default Collapse**: Collapsed extra items into a compact button (`+ Extra Items`) in quick entry modal to keep daily milk logging under 3 seconds.
24. **Filtered Export on History Page**: Enabled 1-click download of filtered text statements reflecting active date, vendor, and status filters.
25. **Enhanced Date & Month Inputs**: Added reserved action padding and min-height preventing calendar icon clipping across mobile browsers.
26. **Password Visibility Toggle**: Added eye icon toggle on login screen to show/hide password text.
27. **Disabled Browser Autofill on Shared Computers**: Added `autoComplete="new-password"` preventing credential leakage on shared devices.
28. **Catalog Dropdown on Send Purchase**: Added direct selection of catalog items with pre-filled units and rates on Send Purchase page.
29. **Login Page Privacy Protection**: Replaced personal email placeholders with generic `name@example.com` and sanitized error messages.
30. **Google Sign-In Reliable OAuth Flow**: Forced Google account picker prompt (`prompt=select_account`) and embedded client fallback configurations.
31. **Branded Android App Vector Icon System**: Replaced template icon with authentic Mitra milk-bottle vector across all screen densities.
32. **Zipalign and Signature Scheme v2/v3 Verification**: Verified APK installation against Android Package Manager security checks.
33. **Production URL WebView Routing**: Configured WebView splash screen to route directly to production domain with cookie persistence.
34. **180-Day Persistent Mobile Session vs 60-Min Browser Expiry**: Extended session lifetime on installed APK/PWA while enforcing 60-minute auto-expiry on shared browsers.
35. **Gated Pre-Login Screen**: Concealed all navigation bars, cards, and data on `/login` prior to authentication.
36. **Google One Tap Native Account Picker**: Integrated Google One Tap prompt on web browser viewports.
37. **OTP-Based Password Reset**: Added 6-digit email OTP password recovery for authorized admins.
38. **Consolidated History Filter Pills**: Merged filters into a unified pill bar (`Today`, `Month`, `Year`, `Range`, `Full Ledger`).
39. **Mobile Responsive Filter Wrapping**: Optimized History filter pills to wrap smoothly without horizontal overflow.
40. **Full Responsive Pass (320px – 430px)**: Verified layouts on compact smartphones (iPhone SE, Galaxy S-series, Pixel).
41. **Font Size & Readability Accessibility Scale**: Added four font size presets (`14px`, `16px`, `18px`, `20px`) for elder accessibility.
42. **Disabled Autofill in Add Administrator Form**: Explicitly blocked browser credential managers from pre-filling new admin fields.
43. **Upgraded Admin Form Primary Buttons**: Styled "Add Administrator" with high-contrast forest green styling.
44. **Purged Legacy Build Artifacts**: Deleted obsolete APK test packages and established `mitra-v1.0.apk` as primary release.
45. **Multi-Language Monthly Report Statements**: Added full English, Hindi, and Marathi translations to generated monthly invoices.
46. **In-App WebView Download Manager Delegation**: Added download skip rules ensuring PDFs, invoices, and APK files trigger Android's native Download Manager.
47. **Mobile Navigation Restructure to 8 Sections**: Expanded navigation access across all 8 features via a mobile More sheet.
48. **Rebranded to Channel Usage**: Updated naming to reflect multi-channel messaging rather than WhatsApp alone.
49. **Personal Phone 1-Tap Channel Optimization**: Pre-filled vendor phone numbers and message text for zero-typing native sharing.
50. **Prominent "+ New Product" Buttons**: Positioned new product buttons on Send Purchase and Extra Items modals.
51. **Vendor Attribution on Home Page Extra Items**: Allowed attributing extra items to specific vendors within the main entry modal.
52. **Personal-Phone 1-Tap WhatsApp Launch & Counter Fix**:
    - Modernized 1-tap links to `https://wa.me/{phone}?text=...` and direct `whatsapp://send?phone=...` app scheme to eliminate stuck "fetching" states.
    - Fixed usage counter so it only increments when the user taps "Open WhatsApp", and updated dashboard labels to "1-tap dispatches launched".
53. **Mobile Navigation Restructure (Settings to Main Bar, Purchase to More)**:
    - Reordered mobile bottom tabs to: **Home**, **History**, **Report**, **Settings**, **More**.
    - Moved **Purchase** into the More sheet alongside Vendors & Products, Rate & Pricing, and Channel Usage.
54. **Sample Data Removal & Standalone SQL Export**:
    - Completely removed hardcoded sample entries from live app defaults and live Supabase database.
    - Exported the complete 5-month realistic sample dataset to `supabase/sample_delivery_seed.sql` for manual execution in the Supabase SQL Editor on demand.
55. **Settings "Delete All Data" Button with Confirmation**:
    - Created `/api/admin/clear-data` and a prominent red button in Settings with a confirmation modal.
    - Safely wipes all operational records (delivery entries, history, purchases, channel logs) while strictly preserving administrator accounts, login credentials, and household configurations.
56. **App-Wide Dark / Light Mode Switchable Theme**:
    - Implemented a complete OLED slate dark palette (`[data-theme="dark"]`) across the entire platform with zero white flash on page load.
    - Added 1-tap Moon/Sun toggle in the main header and a persistent radio selector in Settings (System, Light, Dark).
57. **Price Management Milk Types Simplification**:
    - Streamlined milk options strictly down to Cow Milk and Buffalo Milk, removing extra branded variants while preserving all historical price change audit trails and approval statuses.
58. **Active Channel Verification & Accurate Vendor Mapping**:
    - Fixed channel-selection bug in Send Purchase and Delivery entry flows: strict verification that channels are BOTH user-enabled and configured (`getActiveChannels()`).
    - Fixed vendor mapping so dispatches strictly address the selected vendor's phone number without defaulting to unrelated vendors.
59. **Editable Recipient Mobile Number for Test Sends**:
    - Added an editable mobile number input field in `/whatsapp-usage` with quick autofill chips (`Self / Personal`, `Father / Vendor 1`, `Mother / Vendor 2`).
    - Allows genuine end-to-end receipt testing across 1-tap WhatsApp (`wa.me`), Meta Cloud API, and Fast2SMS.
60. **Cross-Device Sync & Direct Server-Side Sync API**:
    - Added `/api/sync` service-role endpoint and automatic synchronization on window focus, visibility change, and route navigation to eliminate data discrepancies between web and APK.
61. **Genuine Google OAuth Integration**:
    - Removed non-functional placeholder modal from `/login`. Integrated real Supabase Google OAuth (`signInWithOAuth` with `prompt=select_account`) and PKCE code exchange in `/auth/callback` with administrator allowlist validation.
62. **Privacy Protection on Password Reset**:
    - Replaced real email address in Reset / Forgot Password placeholder with generic `demo@example.com` to prevent privacy leaks on shared or demo devices.
63. **End-to-End OTP-Based Password Reset**:
    - Whitelisted `/api/auth/forgot-password` in Next.js middleware, allowing unauthenticated administrators to request OTP verification codes and reset their password securely without hitting 401 Unauthorized errors.
64. **Compact Font Size Stepper & Ultra Extra Large Tier**:
    - Redesigned font size selector in Settings into a compact `[-] [Size Label] [+]` stepper widget for superior mobile ergonomics, and added top-tier "Ultra Extra Large" (`ultra` / 22px).
65. **Android APK Camera Capture & Photo Picker Parity**:
    - Implemented `WebChromeClient.onShowFileChooser` in Android WebView smali code, delegating to Android system `Intent.createChooser` with `MediaStore.ACTION_IMAGE_CAPTURE` and `ACTION_GET_CONTENT`.
    - Configured `FileProvider` paths and manifest permissions (`CAMERA`, `WRITE_EXTERNAL_STORAGE`) so "Take Photo" and "Choose Photo" work identically inside the APK.
66. **100% Web-to-APK Functional Parity Directive**:
    - Added WebView `DownloadListener` to route file downloads (PDFs, text statements, APK updates) to Android's native Download Manager with status bar notifications.
    - Set `not_matching: True` in APK asset configuration so external WhatsApp (`wa.me`), mailto, tel, LinkedIn, and GitHub links open seamlessly in native apps.
67. **Sample Delivery UI Removal from Live Settings Page**:
    - Cleaned up the live Settings page by removing the sample delivery history section, keeping `supabase/sample_delivery_seed.sql` as the standalone external backup.
68. **Creator "About Me" Section**:
    - Added an About Me footer introducing app creator Kabir Bundele, featuring a circular GitHub avatar (`https://github.com/rrbkabir2.png`) and circular icon links to LinkedIn, GitHub, and contact email.
69. **Automated Versioning System & Multi-Release Bumping**:
    - Established centralized `src/lib/version.ts` single source of truth (`APP_VERSION = '1.1'`, `APP_BUILD = 2`) and updated `package.json` to `1.1.0`.
    - Wired version metadata into `setup_apk_resources.py` and `build_mitra_apk.py` to auto-bump `apktool.yml` (`versionCode: 2`, `versionName: '1.1'`) and package versioned APK binaries (`mitra-v1.1.apk`) while preserving `mitra-v1.0.apk` as fallback.
    - Displayed active version badges in Settings and About Me footer.
70. **Dark Mode Visual Redesign & Light Mode Default**:
    - Redesigned `[data-theme="dark"]` using neutral dark obsidian/charcoal tones (`#121413`, cards `#181b18`, inputs `#202421`) paired consistently with Mitra's genuine green brand accent (`#22c55e`, `#16a34a`).
    - Enforced Light Mode as the strict DEFAULT theme for all new sessions by eliminating automatic OS dark mode overrides.
71. **Dedicated High-Visibility Top Navigation Logout Button**:
    - Added a dedicated, prominent `.header-logout-btn` with icon + text in soft red tint (`#fef2f2`, `#b91c1c` / dark mode `rgba(239, 68, 68, 0.16)`) directly in the header action bar across all viewports.
    - Removed redundant Home button and added responsive styling ensuring the logout option is never squeezed off-screen or cut off on smaller displays.
72. **Google Sign-In Callback Race Condition Fix**:
    - Prioritized `supabase.auth.getSession()` check before web session inactivity timeout in `MitraContext.tsx`.
    - Initialized web session activity flags before redirecting in `auth/callback/page.tsx`, eliminating premature sign-outs when returning from Google OAuth.
73. **Developer Console Toast Removal from Android WebView**:
    - Removed `Toast.makeText` debug log rendering in `MainActivity$6.smali`'s `onConsoleMessage` and updated `setup_apk_resources.py` with `"console_log": False` and automatic smali patching, ensuring internal console logs never appear as floating toasts in live user builds.
74. **Settings Page Theme Deduplication**:
    - Removed the redundant in-Settings "Theme & Visual Appearance" card, keeping the top navigation sun/moon button as the single intuitive toggle for light/dark mode.
75. **LinkedIn Profile Clean URL Verification**:
    - Verified and sanitized creator LinkedIn link to clean public format `https://www.linkedin.com/in/kabir-bundele-a2ba81295/` with `target="_blank"` and `rel="noopener noreferrer"`.
76. **Visible Email Address Display & Direct Mailto Launch**:
    - Added a visible readable badge displaying the actual email address (`rrbkabir2@gmail.com`) alongside a 1-tap copy button with instant "Copied!" feedback.
    - Ensured the mailto action reliably launches the user's default email client across mobile devices and desktop browsers.

---

## 9. Environment Configuration Template (`.env.example`)

Create a `.env.local` file in the project root based on this template:

```env
# Application Host URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Primary Supabase Configuration (PostgreSQL + RLS + Storage)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Meta WhatsApp Business Cloud API Configuration
WHATSAPP_ACCESS_TOKEN=your_meta_system_user_permanent_token_here
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id_here
WHATSAPP_BUSINESS_ACCOUNT_ID=your_whatsapp_business_account_id_here
WHATSAPP_APP_SECRET=your_meta_app_secret_here
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_custom_webhook_verify_token_here

# Fast2SMS Transactional Gateway (Optional)
FAST2SMS_API_KEY=your_fast2sms_api_key_here
NEXT_PUBLIC_FAST2SMS_CONFIGURED=true

# Secondary Backup: MongoDB Atlas Cluster (Optional Dual-Write Mirroring)
MONGODB_URI=mongodb+srv://user:pass@cluster0.sample.mongodb.net/mitra_backup?retryWrites=true&w=majority

# Administrative Seed Secret
ADMIN_SEED_SECRET=your_secure_random_seed_secret_here
```

---

## 10. Step-by-Step Scratch Rebuild Guide for AI Coding Tools

When instructed to rebuild Mitra from zero:

1. **Initialize Next.js 15 Project**:
   ```bash
   npx create-next-app@latest mitra --typescript --eslint --no-tailwind --app --src-dir
   cd mitra
   npm install @supabase/supabase-js lucide-react mongodb
   ```
2. **Apply Design System**:
   Create `src/app/globals.css` with CSS custom properties:
   - Primary: `#183d2d` (Deep forest green)
   - Secondary: `#2d6a4f`
   - Background: `#f8fafc`
   - Cards: Glassmorphism `#ffffff` with subtle borders `#e2e8f0`
   - Typography: Clean system sans-serif with senior-friendly readability scaling.
3. **Setup Database**:
   - Execute the SQL schema from **Section 3** in the Supabase SQL Editor.
   - Create a public Supabase Storage bucket named `delivery-photos`.
4. **Seed Primary Administrator**:
   ```bash
   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=your_secure_password npm run seed:admin
   ```
5. **Implement Core State & Context**:
   - Build `src/lib/store.ts` and `src/context/MitraContext.tsx` with full offline `localStorage` fallback and Supabase synchronization.
   - Build `src/lib/messaging.ts` with all 3 channels (WhatsApp Cloud API, Fast2SMS, Personal Phone 1-tap).
6. **Implement Pages**:
   - `src/app/page.tsx` (Home / Today with 3x2 grid and collapsed extra items)
   - `src/app/history/page.tsx` (History with unified filters and statement export)
   - `src/app/pricing/page.tsx` (Rates and proposed price changes)
   - `src/app/reports/page.tsx` (Monthly summaries and invoice export)
   - `src/app/products-vendors/page.tsx` (Vendors, products, and 32-byte tokens)
   - `src/app/send-purchase/page.tsx` (Catalog dropdown purchases and multi-channel dispatch)
   - `src/app/whatsapp-usage/page.tsx` (Trackers, audit logs, and webhook simulator)
   - `src/app/settings/page.tsx` (Font scaling, language, data seeder, Delete All Data button, APK download)
   - `src/app/v/[token]/page.tsx` (Vendor public read-only portal with 1-tap call button)
   - `src/app/login/page.tsx` (Auth screen with password toggle, OTP reset, and Google OAuth)
7. **Verify & Run**:
   ```bash
   npm run build
   npm run dev
   ```
   Open `http://localhost:3000` to test the complete platform.
