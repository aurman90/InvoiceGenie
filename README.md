# InvoiceGenie

> توليد فواتير ZATCA-compliant تلقائياً من نص أو رسالة صوتية

InvoiceGenie lets small contractors, freelancers, and sole proprietors in
Saudi Arabia generate **ZATCA Phase 1 simplified tax invoices** by typing or
speaking a single Arabic sentence:

> "فاتورة لأحمد 500 ريال مقابل دهان"

…and getting a print-ready invoice with a valid TLV/Base64 QR code.

## How it works

1. User writes or records an Arabic sentence in `/new`.
2. Voice → **OpenAI Whisper** (`whisper-1`, `language: "ar"`) → transcript.
3. Transcript → **Claude Sonnet 4.6** with a cached system prompt and a
   `create_invoice` tool definition → structured JSON
   (`customer_name`, `line_items[]`).
4. Totals + VAT (15%) are computed server-side.
5. A ZATCA-compliant **TLV Base64** payload is built from
   `lib/zatca/tlv.ts` (5 tags: seller name, VAT number, timestamp, total with
   VAT, VAT amount) and rendered as a QR code via `qrcode`.
6. Invoice is persisted to Supabase with row-level security.
7. Detail page renders a print-friendly A4 layout with native Arabic RTL
   shaping — click **تحميل / طباعة PDF** to save as PDF via the browser.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- TailwindCSS for styling
- Supabase (Postgres + Auth magic link + RLS)
- `@anthropic-ai/sdk` — Claude parser with **prompt caching** + tool use
- `openai` — Whisper transcription
- `qrcode` — QR image rendering
- `zod` — runtime validation at API boundaries
- `vitest` — unit tests for the ZATCA encoder

## Local setup

```bash
# 1. Install
pnpm install     # or npm install

# 2. Set env
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#        SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY

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
   - Rقم ضريبي: `310122393500003`
3. Visit `/new`, type:
   > فاتورة لأحمد ٥٠٠ ريال مقابل دهان
4. Click **إنشاء الفاتورة**. Expected:
   - `/api/parse` returns
     `{ customer_name: "أحمد", line_items: [{ description: "دهان",
     unit_price: 434.78, qty: 1, vat_rate: 0.15 }] }`
     (price treated as VAT-inclusive → 500 / 1.15)
   - `/api/invoices` inserts a row and redirects to `/invoices/:id`
   - Subtotal `434.78`, VAT `65.22`, total `500.00`
5. Scan the on-screen QR with a ZATCA-compatible scanner — it should decode
   to the 5 TLV tags above.
6. Click **تحميل / طباعة PDF** to print to PDF.

### 3. Voice input

On `/new`, click the 🎤 button, speak the same sentence in Arabic, then stop.
Whisper returns the transcript, which flows into the same pipeline.

### 4. Free-tier gate

Create 20 invoices. The 21st attempt returns HTTP 402 and the dashboard
banner "انتهت باقتك المجانية".

## Project layout

```
app/
├── page.tsx                 # Landing
├── login/page.tsx           # Magic-link login
├── auth/callback/route.ts   # Supabase OAuth callback
├── dashboard/page.tsx       # Invoice list
├── new/page.tsx             # Text + voice input
├── settings/page.tsx        # Business profile
├── invoices/[id]/           # Print-friendly invoice view
└── api/
    ├── parse/route.ts       # Claude parser
    ├── transcribe/route.ts  # Whisper proxy
    ├── invoices/route.ts    # Create / list invoices
    └── auth/signout/route.ts
lib/
├── supabase/                # client, server, middleware helpers
├── zatca/
│   ├── tlv.ts               # 5-tag TLV encoder → Base64
│   ├── tlv.test.ts          # Unit tests (ZATCA reference vector)
│   ├── qr.ts                # TLV → QR PNG dataURL
│   └── validate.ts          # zod schemas + total computation
├── anthropic.ts             # Claude parser (prompt caching + tool use)
├── whisper.ts               # Whisper client
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
- WhatsApp ingress — the marketing copy mentions WhatsApp; for the MVP,
  text/voice input lives in the web app only. A Twilio WhatsApp webhook can
  be added later by reusing `/api/parse` and `/api/invoices`.
- Server-side PDF file generation + Supabase Storage upload (the MVP uses
  `window.print()` for native Arabic shaping — the browser handles RTL and
  glyph shaping perfectly without needing HarfBuzz on the server).

## Scripts

- `pnpm dev` — Next.js dev server
- `pnpm build` — production build
- `pnpm test` — run unit tests (TLV encoder)
- `pnpm lint` — ESLint
