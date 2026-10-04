# Security Policy & Trust Safeguard Guarantees

This document outlines the security architecture, threat model, and trust safeguards of the **Mitra Delivery Confirmation Platform**. Mitra is designed as a tamper-proof trust layer between households and local vendors, prioritizing auditability and data integrity over casual convenience.

---

## 1. Core Trust Safeguard: Non-Repudiable Vendor Confirmation

### The Dispute Problem
Informal dairy and grocery deliveries frequently culminate in month-end billing disputes. When an admin has unilateral power to mark deliveries as "confirmed", the record loses its value as neutral evidence.

### The Architectural Guarantee
1. **Approve and Deny rights belong exclusively to the Vendor**:
   - The Household Admin interface has **zero** capability to change an entry's status to `confirmed` or `denied`.
   - The status column is enforced as **read-only** for the admin role at both the application API layer and the PostgreSQL database trigger layer (`trigger_enforce_tamper_proof_status`).
2. **Database Trigger Enforcement**:
   - A PostgreSQL trigger on the `entries` table inspects the JWT role of the caller. If `auth.role() = 'authenticated'` (the admin's authenticated session), any SQL `UPDATE` statement attempting to change `status` to `confirmed` or `denied` raises an uncatchable database exception.
   - Admin attempts to spoof `status_set_by` or forge status changes result in immediate transaction rollback.
3. **Valid Status Transitions**:
   - `pending` -> `confirmed` (Must be set by `vendor` via token/webhook or `system_auto` after timeout).
   - `pending` -> `denied` (Must be set by `vendor` via token/webhook).
   - `pending` -> `absent` (Can be logged by admin when no delivery occurs, which immediately dispatches an alert to vendor).
4. **Timeout Auto-Confirmation**:
   - If a vendor does not dispute a delivery within the household's configured window (default 24 hours), the system auto-confirms the record with `status_set_by = 'system_auto'`. The UI explicitly displays "Auto-confirmed (no dispute within 24h)" to distinguish it from affirmative vendor confirmation.

---

## 2. Authentication & Authorization Architecture

### Admin Role (Household Owner)
- **Zero Public Registration**: There is **no public sign-up route** anywhere in the deployed web application.
- Initial admin accounts are provisioned via:
  1. A protected backend seeding script (`npm run seed:admin`) requiring `ADMIN_SEED_SECRET`.
  2. Authenticated one-time invitation links generated from within an existing authenticated session.
- Authentication is backed by Supabase Auth with secure session cookies/tokens.
- **Row-Level Security (RLS)**:
  - Every SQL query on `households`, `vendors`, `products`, `entries`, `price_change_requests`, and `whatsapp_usage` is strictly scoped to `admin_id = auth.uid()`.
  - Admins can never read or manipulate another household's data.

### Vendor Role (Dairy / Grocery Delivery Person)
- **Zero Password / Zero Login**: Vendors are non-technical and do not install apps or manage passwords.
- **Cryptographic Token Access**:
  - Access is granted exclusively through unguessable, 32-byte cryptographically secure random tokens (URL-safe hexadecimal or base64url).
  - Tokens are routed through `/v/{long-random-token}` and validate solely against that specific vendor's ID.
  - Cross-vendor or cross-household inspection is impossible; the token's scope is strictly bound to `vendor_id`.
- **Token Revocation & Rotation**:
  - If a vendor's link is ever leaked or shared inappropriately, the household admin can rotate or revoke the token instantly from the **Products & Vendors** dashboard. Rotating the token immediately invalidates the previous link.

---

## 3. WhatsApp Business Cloud API Security

### Secret Hygiene
- All Meta credentials (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`) are loaded from environment variables and must **never** be committed to source control.
- Git tracking is blocked via `.gitignore`. An example template is provided in `.env.example`.

### Webhook Verification & HMAC Signature Validation
- Meta Cloud API sends an `X-Hub-Signature-256` header with every webhook payload.
- Mitra validates this payload by computing an HMAC-SHA256 digest using `WHATSAPP_APP_SECRET`. Payloads failing signature verification are rejected immediately with HTTP 401 Unauthorized.
- The webhook endpoint handles:
  - Interactive button callbacks (`APPROVE_{entry_id}`, `DENY_{entry_id}`).
  - Delivery receipts (`delivered`, `read`) to record cryptographic delivery timestamps (`delivered_confirmed_at`).

### Leak Remediation Protocol
If your WhatsApp Access Token or App Secret is compromised:
1. Immediately log into the [Meta Developer Dashboard](https://developers.facebook.com/).
2. Navigate to your App -> WhatsApp -> API Setup.
3. Revoke and regenerate the System User Access Token.
4. Update the `WHATSAPP_ACCESS_TOKEN` secret in your hosting environment (e.g. Vercel / Docker).
5. Redeploy or restart the container.

---

## 4. Storage & Cost Management Security

### Client-Side Compression & File Sanitization
- Photos taken via the inline camera are compressed on an HTML5 canvas client-side before transmission, reducing file sizes from ~4MB to <150KB.
- Allowed MIME types are restricted strictly to `image/jpeg`, `image/png`, and `image/webp`.
- Maximum upload size is capped at 2MB.

### Storage Lifecycle Management
- Supabase free tier provides ~1GB storage. To prevent storage exhaustion:
  - Once a monthly report is settled and marked paid, admins can trigger the automated storage cleanup job (`/api/storage/cleanup`).
  - This removes aged photo binaries from the storage bucket while **permanently retaining** the immutable delivery ledger (quantity, price, date, timestamp, and status) in PostgreSQL.

---

## 5. Security Checklist for Deployment

- [ ] Ensure `NEXT_PUBLIC_APP_URL` uses `https://` in production.
- [ ] Confirm PostgreSQL RLS is enabled on all tables in Supabase.
- [ ] Verify `enforce_tamper_proof_status` trigger is active on `entries`.
- [ ] Configure `WHATSAPP_APP_SECRET` to enable webhook HMAC validation.
- [ ] Restrict CORS origins on API routes to your verified domain.
- [ ] Store `ADMIN_SEED_SECRET` securely in your password manager.
