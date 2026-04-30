import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { buildZatcaQrBase64 } from "@/lib/zatca/tlv";
import { computeTotals, lineItemSchema } from "@/lib/zatca/validate";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const updateBodySchema = z.object({
  customer_id: z.string().uuid(),
  line_items: z.array(lineItemSchema).min(1),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ invoice: data });
}

/**
 * Update an existing invoice. On edit we:
 *   1) Validate and load the new customer (denormalizing name + VAT again).
 *   2) Recompute totals from the submitted line items.
 *   3) Regenerate the ZATCA TLV/QR payload so it matches the new totals.
 *
 * The invoice_number, uuid, and issue_date are preserved — those are
 * identity fields, not editable content.
 */
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof updateBodySchema>;
  try {
    body = updateBodySchema.parse(await request.json());
  } catch (e) {
    return NextResponse.json(
      { error: "invalid_body", details: (e as Error).message },
      { status: 400 },
    );
  }

  // Load the existing invoice — RLS guarantees we can only see our own.
  const { data: existing, error: exErr } = await supabase
    .from("invoices")
    .select("id, business_id, issue_date, owner_id")
    .eq("id", id)
    .maybeSingle();
  if (exErr) {
    return NextResponse.json({ error: exErr.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Load the seller business (same as in POST — needed for QR regeneration).
  const { data: business, error: bizErr } = await supabase
    .from("businesses")
    .select("name_ar, vat_number")
    .eq("id", existing.business_id)
    .maybeSingle();
  if (bizErr || !business) {
    return NextResponse.json(
      { error: bizErr?.message ?? "missing_business" },
      { status: 500 },
    );
  }

  // Load (and switch to) the customer — RLS-scoped.
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

  // Regenerate QR using the *original* issue_date so the timestamp in the
  // QR payload remains consistent with the printed invoice date.
  const issueDateIso = new Date(existing.issue_date).toISOString();
  const qrBase64 = buildZatcaQrBase64({
    sellerName: business.name_ar,
    vatNumber: business.vat_number,
    timestampIso: issueDateIso.replace(/\.\d{3}Z$/, "Z"),
    totalWithVat: totals.total.toFixed(2),
    vatTotal: totals.vat_amount.toFixed(2),
  });

  const { data: updated, error: updErr } = await supabase
    .from("invoices")
    .update({
      customer_id: customer.id,
      customer_name: customer.name,
      customer_vat: customer.vat_number ?? null,
      due_date: body.due_date ?? null,
      subtotal: totals.subtotal,
      vat_amount: totals.vat_amount,
      total: totals.total,
      line_items: body.line_items,
      qr_base64: qrBase64,
    })
    .eq("id", id)
    .select()
    .single();

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ invoice: updated });
}
