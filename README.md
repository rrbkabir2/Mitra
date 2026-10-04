# 🥛 Mitra — Daily Delivery Confirmation Platform

> **A permanent, tamper-proof daily delivery trust layer between households and local vendors.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%26%20Storage-emerald?style=flat-square&logo=supabase)](https://supabase.com/)
[![WhatsApp Cloud API](https://img.shields.io/badge/WhatsApp-Business%20Cloud%20API-25D366?style=flat-square&logo=whatsapp)](https://developers.facebook.com/docs/whatsapp/cloud-api)
[![Security Policy](https://img.shields.io/badge/Security-RLS%20%26%20Tamper--Proof-red?style=flat-square)](./SECURITY.md)

---

## 📖 Executive Summary & Core Principle

In India and many parts of the world, households order daily milk and provisions informally from local vendors. At the end of each month, disagreements frequently arise over exact quantities delivered, absent days, and amounts owed.

**Mitra solves this trust problem permanently by creating a tamper-proof, jointly confirmed daily record.**

### 🌟 The Core Principle
- **WhatsApp is the primary channel for the vendor.**
  The vendor is non-technical, **never logs in**, **never installs an app**, and **never manages a password**.
- All the vendor ever does is tap **Approve (स्वीकृत)** or **Deny (अस्वीकृत)** on a WhatsApp interactive message or tap a secure, single-tap tokenized link.
- The household admin operates a full web application with comprehensive ledger control, instant reports, and usage tracking.

---

## 🛡️ Core Trust Safeguards (Non-Negotiable Security Guarantees)

1. **Admins Cannot Approve or Deny on Vendor Behalf**:
   - The confirmation status of an entry is **strictly read-only for admins**.
   - There is no button, API route, or database permission that permits an admin session to mark an entry as `confirmed` or `denied`.
   - **Enforced at the PostgreSQL Trigger layer** (`enforce_tamper_proof_status`) and the API layer. Attempts by an admin session to forge status updates result in immediate database-level transaction rollback.
2. **Zero Public Self-Serve Registration**:
   - There is **no public sign-up page** in the deployed application.
   - Household accounts are provisioned exclusively through protected backend seeding (`npm run seed:admin`) or authenticated invites.
3. **Cryptographic Per-Vendor Tokens**:
   - Vendor links (`/v/{token}`) use unguessable, 32-byte cryptographically secure random tokens.
   - If a link is ever shared or compromised, admins can rotate or revoke the token instantly.
4. **24-Hour Timeout Auto-Confirmation**:
   - If a vendor does not dispute a delivery within 24 hours, the system auto-confirms it with `status_set_by = 'system_auto'`. The UI clearly distinguishes auto-confirmed entries from affirmative vendor approvals.

---

## 🏗️ Technology Stack & Justification

| Layer | Technology | Justification |
| :--- | :--- | :--- |
| **Framework** | **Next.js 15 (App Router)** | Full-stack server/client architecture in a single codebase. Server actions and API routes securely handle webhooks, HMAC signature verification, and service-role database operations without exposing secrets to browsers. |
| **Language** | **TypeScript** | Strict type safety for complex financial ledgers, audit models, and WhatsApp payload schemas. |
| **Database & Auth** | **Supabase (PostgreSQL + RLS)** | Production-grade relational database with declarative Row Level Security (RLS) guaranteeing multi-tenant isolation, plus managed storage for delivery photos within the 1GB free tier. |
| **Messaging** | **Official WhatsApp Business Cloud API (Meta)** | Direct API integration with Meta's official Graph API for high deliverability, interactive reply buttons, and delivery status receipts. |
| **Styling** | **Vanilla CSS (Design System Tokens)** | Pixel-perfect compliance with the canonical Figma specification, zero heavy framework overhead, custom glassmorphism, responsive 3x2 grid, and smooth micro-interactions. |
| **Localization** | **Custom i18n Engine** | Comprehensive full-UI translation across English, Hindi (हिंदी), and Marathi (मराठी). |

---

## 📱 Screen-by-Screen Features

### 1. Today (Canonical 3x2 Quantity Grid)
- **3x2 Grid**: 0.5L, 1.0L, 1.5L, 2.0L, 2+L Custom Stepper, and Absent.
- **Milk Variety Toggle**: Cow Milk (गाय का दूध) vs Buffalo Milk (भैंस का दूध) with active rate display.
- **Quick Entry Modal**: Pre-filled quantity, delivery time, and calculated price.
- **Bundled Extra Items**: Add curd, paneer, or extras to save on WhatsApp quota.
- **Client-Side Photo Compression**: HTML5 Canvas compresses smartphone camera photos from 4MB to <150KB before upload.
- **One-Tap Absent**: Marks 0 Litres and alerts the vendor that no milk was delivered today.

### 2. Delivery History
- Row-by-row immutable ledger with date, items, total, and read-only status badges.
- Detail modal with photo proof, WhatsApp delivery timestamp, and shareable vendor proof link.

### 3. Price Management
- Current active rate per milk variety.
- Propose new price with trust safeguard notice (old rate remains active until approved by vendor on WhatsApp).
- Full audit log of all price change proposals.

### 4. Monthly Reports & Invoicing
- Month selector with aggregated milk volume and total expenditure.
- Confirmed vs. Pending vs. Absent breakdowns.
- One-click **Print / Save as PDF** and **Download Plain Text Invoice**.
- Auto-send monthly bill to vendor on month end via WhatsApp.

### 5. Products & Vendors Management
- Add vendors (Dairy, Grocery, Other) with phone number.
- Rotate / Revoke 32-byte cryptographic vendor tokens on demand.
- Add products with custom unit types (`litre`, `kilogram`, `count`).

### 6. Send One-Time Purchase
- Log non-recurring items (ghee, butter, sweets, groceries) outside daily milk.
- Attaches receipt photo and dispatches one-off WhatsApp message.

### 7. WhatsApp Usage & Free-Tier Tracker
- Tracks consumption of the **1,000 free monthly service messages** provided by Meta.
- Vendor-by-vendor usage breakdown and pace-based month-end projection.
- Warning banner when trending to exceed the free tier.
- **Built-in WhatsApp Webhook Simulator Console** for testing vendor approvals without live Meta credentials!

### 8. Settings & Multi-Lingual Support
- One-click language switcher: **English**, **Hindi (हिंदी)**, **Marathi (मराठी)**.
- Advanced Mode toggle.
- Storage cleanup job (pruning photos older than 30 days while permanently preserving ledger rows).

### 9. Vendor Confirmation Portal (`/v/{token}`)
- Zero-login, mobile-optimized portal for the delivery person.
- Large, simple **Approve (स्वीकृत)** and **Deny (अस्वीकृत)** action buttons.
- Isolated strictly to that specific vendor's deliveries.

---

## 🚀 Quickstart & Setup Guide

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/mitra.git
cd mitra
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

### 3. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
The platform includes built-in reactive storage pre-seeded with realistic data so you can test all flows immediately without configuring external credentials.

---

## 🔑 External Setup: WhatsApp Cloud API & Supabase

> **Important Notice:** Meta Business verification and WhatsApp Cloud API approval are manual external processes handled by Meta and cannot be automated. Approval typically takes from 2 days up to 2 weeks.

### Step A: Meta WhatsApp Business Cloud API Setup
1. **Register as a Meta Developer**: Go to [developers.facebook.com](https://developers.facebook.com/) and create a developer account.
2. **Create a Meta App**:
   - Select **Other** &rarr; **Business**.
   - Name your app `Mitra Delivery Platform`.
3. **Add WhatsApp Product**:
   - In the App Dashboard, click **Set Up** on the **WhatsApp** card.
4. **Get Temporary Credentials**:
   - In WhatsApp &rarr; API Setup, copy the temporary Access Token and Phone Number ID into your `.env.local`.
5. **Create a System User & Permanent Token (Production)**:
   - Go to **Meta Business Settings** &rarr; **System Users**.
   - Create an Admin System User and generate a token with permissions: `whatsapp_business_messaging`, `whatsapp_business_management`.
   - Set token expiration to **Never**.
6. **Configure Webhook**:
   - In WhatsApp &rarr; Configuration, set Callback URL to `https://your-domain.com/api/whatsapp/webhook`.
   - Set Verify Token to match `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in your `.env.local`.
   - Subscribe to the `messages` field.

### Step B: Supabase Database & Storage Setup
1. Create a new project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** and execute `supabase/migrations/001_initial_schema.sql`.
3. Create a public Storage bucket named `delivery-photos`.
4. Copy your **Project URL**, **Anon Key**, and **Service Role Key** into `.env.local`.
5. Run the secure admin provisioning script:
   ```bash
   ADMIN_EMAIL=your@email.com ADMIN_PASSWORD=your_secure_password npm run seed:admin
   ```

---

## 🔒 Security Architecture

For detailed information on database triggers, RLS policies, webhook HMAC verification, and token rotation, please read our dedicated [SECURITY.md](./SECURITY.md) document.

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
