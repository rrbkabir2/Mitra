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
- **Zero-Friction for the Vendor**:
  The vendor is non-technical, **never logs in**, **never installs an app**, and **never manages a password**.
- **Permanent, Informative Safeguard**:
  The vendor receives neutral, tamper-proof daily delivery confirmations via WhatsApp, SMS, or direct phone dispatch. Their personal verification link (`/v/{token}`) displays a real-time, read-only delivery ledger.
- **Dispute Resolution via Phone Call**:
  Rather than fragile chat buttons, any delivery questions or disagreements are resolved directly via a 1-tap "Call Household" card (`tel:+91...`).
- The household admin operates a full web application with comprehensive ledger control, instant reports, multi-channel dispatch, and automated backups.

---

## 🛡️ Core Trust Safeguards (Non-Negotiable Security Guarantees)

1. **Admins Cannot Tamper with Vendor Records**:
   - The confirmation status of an entry is **strictly read-only for admins**.
   - There is no button, API route, or database permission that permits an admin session to mark an entry as `confirmed` or `denied`.
   - **Enforced at the PostgreSQL Trigger layer** (`enforce_tamper_proof_status`) and the API layer. Attempts by an admin session to forge status updates result in immediate database-level transaction rollback.
2. **Transparent Correction Trail**:
   - When an entry is edited, an audit log records the correction reason, timestamp, and previous values. The vendor receives an automated correction notice across all active messaging channels.
   - Any deleted entry flags subsequent replacement entries with a conspicuous **Corrected Entry** (`is_corrected`) badge to prevent billing confusion.
3. **Zero Public Self-Serve Registration**:
   - There is **no public sign-up page** in the deployed application.
   - Household accounts are provisioned exclusively through protected backend seeding (`npm run seed:admin`) or authenticated invites with strict email allow-listing (`rrbkabir2@gmail.com`).
4. **Cryptographic Per-Vendor Tokens**:
   - Vendor links (`/v/{token}`) use unguessable, 32-byte cryptographically secure random tokens.
   - If a link is ever shared or compromised, admins can rotate or revoke the token instantly.
5. **24-Hour Timeout Auto-Confirmation**:
   - If an entry is not disputed within 24 hours, the system auto-confirms it with `status = 'auto-confirmed'` and `status_set_by = 'system_auto'`. The UI auditable proof distinguishes auto-confirmed entries from affirmative responses.

---

## 🏗️ Technology Stack & Justification

| Layer | Technology | Justification |
| :--- | :--- | :--- |
| **Framework** | **Next.js 15 (App Router)** | Full-stack server/client architecture in a single codebase. Server actions and API routes securely handle webhooks, HMAC signature verification, and service-role database operations without exposing secrets to browsers. |
| **Language** | **TypeScript 5.7** | Strict type safety for complex financial ledgers, audit models, and messaging payload schemas. |
| **Primary Database & Auth** | **Supabase (PostgreSQL + RLS)** | Production-grade relational database with declarative Row Level Security (RLS) guaranteeing multi-tenant isolation, plus managed storage for delivery photos within the free tier. |
| **Secondary Backup Database** | **MongoDB Atlas Cluster** | Real-time dual-write mirroring on every insert/update/delete. Provides instant disaster recovery via `npm run restore:mongo`. |
| **Messaging Channels** | **3 Swappable Dispatchers** | Meta WhatsApp Business Cloud API, Fast2SMS Transactional Gateway (₹0.20/SMS), and Personal Phone 1-Tap Channel (`https://wa.me/` / native SMS). Multi-select enabled. |
| **Android Target** | **Standalone APK + PWA** | Installable Android APK v0.1 (`/downloads/mitra-v0.1.apk`) + PWA with zero background battery execution guarantee. |
| **Styling** | **Vanilla CSS (Design System Tokens)** | Pixel-perfect compliance with the canonical Figma specification, zero heavy framework overhead, custom glassmorphism, responsive 3x2 grid, and smooth micro-interactions. |
| **Localization** | **Custom i18n Engine** | Comprehensive full-UI translation across English, Hindi (हिंदी), and Marathi (मराठी). |

---

## 📱 Screen-by-Screen Features

### 1. Today (Canonical 3x2 Quantity Grid)
- **3x2 Grid**: 0.5L, 1.0L, 1.5L, 2.0L, 2+L Custom Stepper, and Absent.
- **Milk Variety Toggle**: Cow Milk (गाय का दूध) vs Buffalo Milk (भैंस का दूध) with active rate display.
- **Quick Entry Modal**: Pre-filled quantity, delivery time, and calculated price.
- **Collapsed Extra Items**: Hidden by default as a single compact button (`+ Extra Items`) to keep the quick-entry modal fast and clean for everyday milk logging. Opens into the catalog and custom product picker only upon tap.
- **Bundled Extras**: Add curd, paneer, or catalog extras to save on messaging quotas.
- **Client-Side Photo Compression**: HTML5 Canvas compresses smartphone camera photos from 4MB to <150KB before upload.
- **One-Tap Absent**: Marks 0 Litres and alerts the vendor that no milk was delivered today.
- **Inline Correction & Detail Modal**: Tap any recorded entry to view photo proof, launch inline corrections, or delete entries with vendor re-notification.

### 2. Delivery History
- Comprehensive timeframe filters: **Today**, **Month**, **Year**, **Custom Date Range (Multi-Month From/To)**, **All**, and **Full Ledger**.
- **Vendor Filter**: Narrow records down to an individual vendor or view all vendors combined.
- **Filtered Downloadable Export**: One-click **Download Export** file (`.txt`) and **Print / PDF** reflecting the active filters (Date Range, Status, and Vendor) clearly labeled at the top of the statement.
- **Enhanced Date & Month Inputs**: Clean padding, proper min-height, and reserved action spacing ensuring calendar picker icons display crisply without clipping or cramping across desktop and mobile browsers.
- Row-by-row immutable ledger with date, items, total, and read-only status badges.
- Detail modal with photo proof, audit trail, correction history, and shareable vendor proof link.
- Action triggers for transparent editing and entry deletion.

### 3. Price Management
- Current active rate per milk variety.
- Propose new price with trust safeguard notice (old rate remains active until acknowledged by vendor).
- Full audit log of all price change proposals.

### 4. Monthly Reports & Invoicing
- Month selector with aggregated milk volume and total expenditure.
- Confirmed vs. Auto-Confirmed vs. Pending vs. Absent breakdowns.
- One-click **Print / Save as PDF** and **Download Plain Text Invoice**.
- Vendor-specific toggle for automated month-end WhatsApp/SMS billing summary.

### 5. Products & Vendors Management
- Add vendors (Dairy, Grocery, Other) with phone number.
- Rotate / Revoke 32-byte cryptographic vendor tokens on demand.
- Add products with custom unit types (`litre`, `kilogram`, `count`).

### 6. Send One-Time Purchase
- Log non-recurring items (ghee, butter, sweets, groceries) outside daily milk.
- Attaches receipt photo and dispatches one-off WhatsApp/SMS message.

### 7. Multi-Channel Messaging & Usage Trackers
- Independent side-by-side trackers:
  - **WhatsApp Cloud API**: Tracks consumption of Meta's 1,000 free monthly service conversations with pace projection.
  - **Fast2SMS Gateway**: Message count tracker with live rupee expenditure calculations (~₹0.20/SMS).
  - **Personal Phone 1-Tap**: History of manually dispatched native notifications.
- Unified dispatch audit log showing all outgoing delivery confirmations.
- **Built-in Webhook Simulator Console** for testing vendor delivery callbacks without live credentials.

### 8. Settings & Security
- **Web Browser Session Auto-Expiry**: Closing the browser/tab or 60 minutes of inactivity requires admin re-authentication on shared computers, while trusted installed PWA/Android devices enjoy seamless persistent sessions.
- **5-Month Realistic Sample Data Seeder**: Pre-loaded database generator covering June through October 2026 across 3 vendors (Ramesh Patil Dairy, Kisan Fresh Groceries, Amul Country Fresh) with a varied mix of statuses (Pending, Confirmed, Auto-Confirmed, Denied, Absent). Accessible via 1-click in Settings and `/api/admin/seed`.
- One-click language switcher: **English**, **Hindi (हिंदी)**, **Marathi (मराठी)**.
- **Downloadable Android App**: One-click download of `mitra-v0.1.apk` + PWA Home Screen installation.
- **Messaging Channels Multi-Select**: Enable or disable any combination of WhatsApp, Fast2SMS, and Personal Phone channels.
- **MongoDB Atlas Backup Status**: Real-time cluster health check and connection latency monitor.
- Storage cleanup job (pruning photos older than 30 days while permanently preserving ledger rows).

### 9. Vendor Read-Only View (`/v/{token}`)
- Zero-login, mobile-optimized public portal for the delivery person.
- Neutral, permanent record summary of today's delivery and cumulative monthly deliveries.
- 1-tap "Call Household" dispute card for immediate voice clarification.
- Strictly isolated to that specific vendor's deliveries.

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

### Step C: Secondary MongoDB Atlas Setup & Disaster Recovery
To provide complete data resilience and guard against single-provider cloud failures or accidental deletions, Mitra features real-time dual-database mirroring with MongoDB Atlas.

1. **Create Free MongoDB Cluster**: Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and create a free M0 shared cluster.
2. **Database Access & Network Access**:
   - In Database Access, create a user (e.g. `mitra_admin`) with read/write privileges.
   - In Network Access, whitelist `0.0.0.0/0` (allow access from anywhere) so Vercel serverless functions can connect.
3. **Set Connection String**:
   Copy your connection URI into `.env.local`:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/mitra_backup?retryWrites=true&w=majority
   ```
4. **Live Asynchronous Mirroring**:
   Every database write in Mitra (new deliveries, price changes, products, purchases, edits, and deletions) automatically mirrors to the MongoDB Atlas cluster via the internal `/api/backup/mirror` pipeline.
5. **1-Command Disaster Recovery Restore**:
   If Supabase ever undergoes maintenance, data corruption, or accidental row deletion, run:
   ```bash
   npm run restore:mongo
   ```
   The restore script queries all collections from MongoDB Atlas (`households`, `vendors`, `products`, `entries`, `purchases`, `price_requests`) and restores/upserts them directly back into Supabase PostgreSQL.

### Step D: Multi-Channel Messaging Setup (Fast2SMS & Personal Phone)
1. **Fast2SMS Transactional Gateway**:
   - Sign up at [fast2sms.com](https://www.fast2sms.com/) and obtain your Quick Transactional API Key.
   - Add to `.env.local`:
     ```env
     FAST2SMS_API_KEY=your_fast2sms_api_key_here
     ```
   - Transactional SMS messages cost ~₹0.20 per message and deliver instantly within India without requiring Meta app verification.
2. **Personal Phone 1-Tap Channel**:
   - Requires zero external API keys.
   - Generates pre-formatted WhatsApp Web (`https://wa.me/`) and SMS URIs (`sms:+91...`) for direct dispatch from the admin's smartphone.
3. **Channel Multi-Select**:
   - Navigate to **Settings** (`/settings`) &rarr; **Messaging Channels Configuration**.
   - Check or uncheck any combination of the 3 channels. Delivery entries will automatically dispatch to all selected channels simultaneously.

---

## ⚡ Automated Supabase Keep-Alive (Free-Tier Auto-Pause Prevention)

Supabase free-tier projects automatically pause after **7 days of inactivity**, requiring manual resumption via the Supabase dashboard. To guarantee Mitra remains uninterrupted as a daily-use household platform, an automated keep-alive system is configured.

### 🛠️ Architecture & Components Configured

| Component | Location | Description |
| :--- | :--- | :--- |
| **API Endpoint** | [`src/app/api/keep-alive/route.ts`](./src/app/api/keep-alive/route.ts) | A dynamic endpoint (`/api/keep-alive`) that executes a lightweight read query (`SELECT id, name FROM households LIMIT 1`) against Supabase. This registers real query activity with Supabase's PostgreSQL telemetry and resets the inactivity countdown. |
| **Public Middleware Bypass** | [`src/middleware.ts`](./src/middleware.ts) | Whitelists `/api/keep-alive` from session cookie requirements so automated pingers can query it. |
| **Automated Cron Workflow** | [`.github/workflows/supabase-keep-alive.yml`](./.github/workflows/supabase-keep-alive.yml) | A zero-cost GitHub Actions workflow scheduled every **2 days** (`0 4 */2 * *`), well within the 7-day pause window. Pings both the deployed Vercel application endpoint and directly queries the Supabase REST API as a safety net. |

### 🔍 Verification & Monitoring

1. **Verify Endpoint Locally or in Production**:
   ```bash
   curl -s https://mitra-beryl.vercel.app/api/keep-alive
   ```
   **Expected Response (HTTP 200)**:
   ```json
   {
     "status": "ok",
     "service": "mitra-delivery-platform",
     "action": "supabase-keep-alive",
     "timestamp": "2026-10-15T06:41:38.607Z",
     "database": {
       "configured": true,
       "status": "healthy_active",
       "latencyMs": 763,
       "recordsFound": 1,
       "error": null
     },
     "timing": { "totalMs": 763 },
     "keepAliveGuarantee": "PostgreSQL read transaction executed to prevent free-tier auto-pause."
   }
   ```

2. **Verify on GitHub**:
   - Navigate to your repository's **Actions** tab: [https://github.com/rrbkabir2/Mitra/actions](https://github.com/rrbkabir2/Mitra/actions)
   - Select **Supabase Database Keep-Alive**.
   - Click **Run workflow** &rarr; **Run workflow** to test execution on demand.

3. **Optional External Uptime Pingers**:
   You can also point any free external uptime monitor (e.g., [Cron-Job.org](https://cron-job.org/), [UptimeRobot](https://uptimerobot.com/), or [BetterUptime](https://betteruptime.com/)) to:
   ```text
   https://mitra-beryl.vercel.app/api/keep-alive
   ```
   Set the interval to once every 24 or 48 hours.

### 🛑 Reconfiguration or Disabling (When Upgrading to Paid Tier)

If Mitra is migrated to a paid Supabase plan (Pro, Team, or Enterprise), projects never pause, making this keep-alive job optional.

- **To Disable**: Delete `.github/workflows/supabase-keep-alive.yml` or go to **GitHub** &rarr; **Actions** &rarr; **Supabase Database Keep-Alive** &rarr; click **...** (overflow menu) &rarr; **Disable workflow**.
- **To Reconfigure Target URL**: If your domain changes from `mitra-beryl.vercel.app`, update the target URL in `.github/workflows/supabase-keep-alive.yml`.

---

## 🔒 Security Architecture

For detailed information on database triggers, RLS policies, webhook HMAC verification, and token rotation, please read our dedicated [SECURITY.md](./SECURITY.md) document.

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
