import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { buildZatcaQrBase64 } from "@/lib/zatca/tlv";
import { computeTotals, lineItemSchema } from "@/lib/zatca/validate";
import { getUsage } from "@/lib/usage";

export const runtime = "nodejs";

const createBodySchema = z.object({
  customer_id: z.string().uuid(),
  line_items: z.array(lineItemSchema).min(1),
  // YYYY-MM-DD (typically the first day of the due month)
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  source: z.enum(["text", "voice"]).default("text"),
  doc_type: z.enum(["invoice", "quotation"]).default("invoice"),
  notes_override: z.string().max(500).nullable().optional(),
  hide_notes: z.boolean().optional(),
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
      "id, invoice_number, customer_name, total, issue_date, due_date, source, created_at, doc_type, status",
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

  const { data: customer, error: custErr } = await supabase
    .from("customers")
    .select("id, name, vat_number")
    .eq("id", body.customer_id)
    .maybeSingle();
  if (custErr) {
    return NextResponse.json({ error: custErr.message }, { status: 500 });
  }
  if (!customer) {
    return NextResponse.json({ error: "customer_not_found" }, { status: 400 });
  }

  const totals = computeTotals(body.line_items);
  const issueDate = new Date();
  const timestampIso = issueDate.toISOString().replace(/\.\d{3}Z$/, "Z");

  const { count: existingCount } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("business_id", business.id)
    .eq("doc_type", body.doc_type);
    
  const prefix = body.doc_type === "quotation" ? "QUO-" : "INV-";
  const invoiceNumber = `${prefix}${String((existingCount ?? 0) + 1).padStart(5, "0")}`;

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
      customer_id: customer.id,
      customer_name: customer.name,
      customer_vat: customer.vat_number ?? null,
      issue_date: issueDate.toISOString(),
      due_date: body.due_date ?? null,
      subtotal: totals.subtotal,
      vat_amount: totals.vat_amount,
      total: totals.total,
      line_items: body.line_items,
      qr_base64: qrBase64,
      source: body.source,
      doc_type: body.doc_type,
      status: "unpaid",
      notes_override: body.notes_override ?? null,
      hide_notes: body.hide_notes ?? false,
    })
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ invoice: inserted });
}
