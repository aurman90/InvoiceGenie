import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { buildZatcaQrBase64 } from "@/lib/zatca/tlv";
import {
  computeTotals,
  parsedInvoiceSchema,
} from "@/lib/zatca/validate";
import { getUsage } from "@/lib/usage";

export const runtime = "nodejs";

const createBodySchema = z.object({
  parsed: parsedInvoiceSchema,
  source: z.enum(["text", "voice"]).default("text"),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, customer_name, total, issue_date, source, created_at",
    )
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ invoices: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof createBodySchema>;
  try {
    body = createBodySchema.parse(await request.json());
  } catch (e) {
    return NextResponse.json(
      { error: "invalid_body", details: (e as Error).message },
      { status: 400 },
    );
  }

  // Free-tier gate (counter only for MVP).
  const usage = await getUsage(user.id);
  if (usage.overLimit) {
    return NextResponse.json(
      {
        error: "quota_exceeded",
        used: usage.used,
        limit: usage.limit,
        message: "Free tier limit reached. Please subscribe to continue.",
      },
      { status: 402 },
    );
  }

  // Load the user's business (required to generate a valid ZATCA QR).
  const { data: business, error: bizErr } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();
  if (bizErr) {
    return NextResponse.json({ error: bizErr.message }, { status: 500 });
  }
  if (!business) {
    return NextResponse.json(
      { error: "missing_business", message: "Set up your business first" },
      { status: 400 },
    );
  }

  const totals = computeTotals(body.parsed.line_items);
  const issueDate = new Date();
  const timestampIso = issueDate.toISOString().replace(/\.\d{3}Z$/, "Z");

  // Sequential invoice number per business. We use the current count + 1 —
  // the unique index on (business_id, invoice_number) protects against races.
  const { count: existingCount } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("business_id", business.id);
  const invoiceNumber = `INV-${String((existingCount ?? 0) + 1).padStart(5, "0")}`;

  const qrBase64 = buildZatcaQrBase64({
    sellerName: business.name_ar,
    vatNumber: business.vat_number,
    timestampIso,
    totalWithVat: totals.total.toFixed(2),
    vatTotal: totals.vat_amount.toFixed(2),
  });

  const uuid = crypto.randomUUID();

  const { data: inserted, error: insertErr } = await supabase
    .from("invoices")
    .insert({
      business_id: business.id,
      owner_id: user.id,
      invoice_number: invoiceNumber,
      uuid,
      customer_name: body.parsed.customer_name,
      customer_vat: body.parsed.customer_vat ?? null,
      issue_date: issueDate.toISOString(),
      subtotal: totals.subtotal,
      vat_amount: totals.vat_amount,
      total: totals.total,
      line_items: body.parsed.line_items,
      qr_base64: qrBase64,
      source: body.source,
    })
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ invoice: inserted });
}
