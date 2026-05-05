# InvoiceGenie

> فواتير ضريبية مبسطة متوافقة مع ZATCA للمقاولين والفريلانسرز في السعودية

InvoiceGenie lets small contractors, freelancers, and sole proprietors in
Saudi Arabia issue **ZATCA Phase 1 simplified tax invoices** from a simple
Arabic form — with a print-ready A4 layout and a valid TLV/Base64 QR code.

## How it works

1. User signs in via a Supabase magic link at `/login`.
2. User sets up their business profile at `/settings` (Arabic name + 15-digit
   VAT number).
3. User creates an invoice at `/new` — customer name, line items, quantities,
   and VAT-exclusive unit prices. VAT (15%) is computed automatically.
4. On submit, totals are validated server-side by `lib/zatca/validate.ts`.
5. A ZATCA-compliant **TLV Base64** payload is built from
   `lib/zatca/tlv.ts` (5 tags: seller name, VAT number, timestamp, total with
   VAT, VAT amount) and rendered as a QR code via `qrcode`.
6. Invoice is persisted to Supabase with row-level security (each user sees
   only their own invoices).
7. The detail page at `/invoices/[id]` renders a print-friendly A4 layout
   with native Arabic RTL shaping — click **تحميل / طباعة PDF** to save as
   PDF via the browser.

A public demo at `/demo` lets anyone try the QR generation without signing
in — the form runs entirely in the browser and persists nothing.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- TailwindCSS for styling
- Supabase (Postgres + Auth magic link + RLS)
- `qrcode` — QR image rendering
- `zod` — runtime validation at API boundaries
- `vitest` — unit tests for the ZATCA encoder

## Local setup

```bash
# 1. Install
pnpm install

# 2. Set env
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Run Supabase migrations
supabase db reset   # applies supabase/migrations/0001_init.sql

# 4. Dev server
pnpm dev            # http://localhost:3000

# 5. Run tests
pnpm test
```

## Verification

### 1. TLV unit tests

```bash
pnpm test
```

Exercises `lib/zatca/tlv.ts` against the ZATCA reference sample (seller "Bob",
VAT `1234567891`, total `100.00`, VAT `15.00` at `2022-04-25T15:30:00Z`) and
asserts:

- Exact byte layout of the 5 TLV records
- Pinned Base64 output
  `AQNCb2ICCjEyMzQ1Njc4OTEDFDIwMjItMDQtMjVUMTU6MzA6MDBaBAYxMDAuMDAFBTE1LjAw`
- Round-trip decoding of all 5 fields
- UTF-8 encoding of Arabic seller names
- 255-byte length guard

### 2. End-to-end smoke test

1. Open `http://localhost:3000`, click **ابدأ مجاناً**, sign in with a magic
   link.
2. Visit `/settings` and fill in a business:
   - اسم المنشأة: `شركة التجربة`
   - الرقم الضريبي: `310122393500003`
3. Visit `/new` and fill in:
   - اسم العميل: `أحمد`
   - بند: وصف `دهان`، كمية `1`، السعر قبل الضريبة `434.78`
4. Click **إنشاء الفاتورة**. Expected:
   - `/api/invoices` inserts a row and redirects to `/invoices/:id`
   - Subtotal `434.78`, VAT `65.22`, total `500.00`
5. Scan the on-screen QR with a ZATCA-compatible scanner — it should decode
   to the 5 TLV tags above.
6. Click **تحميل / طباعة PDF** to print to PDF.

### 3. Free-tier gate

Create 20 invoices. The 21st attempt returns HTTP 402 and the dashboard
shows the banner "انتهت باقتك المجانية".

## Project layout

```
app/
├── page.tsx                 # Landing
├── demo/page.tsx            # Public no-auth demo
├── login/page.tsx           # Magic-link login
├── auth/callback/route.ts   # Supabase OAuth callback
├── dashboard/page.tsx       # Invoice list
├── new/page.tsx             # Manual invoice form
├── settings/page.tsx        # Business profile
├── invoices/[id]/           # Print-friendly invoice view
└── api/
    ├── invoices/route.ts    # Create / list invoices
    └── auth/signout/route.ts
lib/
├── supabase/                # client, server, proxy helpers
├── zatca/
│   ├── tlv.ts               # 5-tag TLV encoder → Base64
│   ├── tlv.test.ts          # Unit tests (ZATCA reference vector)
│   ├── qr.ts                # TLV → QR PNG dataURL
│   └── validate.ts          # zod schemas + total computation
└── usage.ts                 # Free-tier counter
supabase/migrations/0001_init.sql
```

## ZATCA compliance notes

This MVP targets **Phase 1** (simplified tax invoice with QR code). The QR
payload follows the 5-tag TLV specification from
[ZATCA's QRCodeCreation.pdf](https://zatca.gov.sa/en/E-Invoicing/SystemsDevelopers/Documents/QRCodeCreation.pdf).

**Out of scope (follow-ups):**

- Phase 2 integration — cryptographic stamp via CSID/CSR, UBL 2.1 XML
  generation, and real-time reporting to the FATOORA portal. Requires
  per-merchant ZATCA onboarding.
- Payment collection for the $15/month tier (currently gated by a simple
  counter only — the "Subscribe" CTA is inert).
- Server-side PDF file generation + Supabase Storage upload (the MVP uses
  `window.print()` for native Arabic shaping — the browser handles RTL and
  glyph shaping perfectly without needing HarfBuzz on the server).

## Scripts

- `pnpm dev` — Next.js dev server
- `pnpm build` — production build
- `pnpm test` — run unit tests (TLV encoder)
- `pnpm lint` — ESLint
