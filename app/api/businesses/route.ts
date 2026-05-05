import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { businessInputSchema } from "@/lib/businesses";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("businesses")
    .select(
      "id, name_ar, name_en, vat_number, address_ar, logo_url, brand_color, invoice_template, invoice_notes, invoice_settings, stamp_url",
    )
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ business: data });
}

/**
 * Upsert the current user's business record. Only one row per owner_id is
 * allowed by convention — we look up by owner_id and update or insert.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = businessInputSchema.parse(await request.json());
  } catch (e) {
    return NextResponse.json(
      { error: "invalid_body", details: (e as Error).message },
      { status: 400 },
    );
  }

  const payload = {
    owner_id: user.id,
    name_ar: body.name_ar,
    name_en: body.name_en ?? null,
    vat_number: body.vat_number,
    address_ar: body.address_ar ?? null,
    logo_url: body.logo_url ?? null,
    brand_color: body.brand_color,
    invoice_template: body.invoice_template,
    invoice_notes: body.invoice_notes ?? null,
    invoice_settings: body.invoice_settings ?? undefined,
    stamp_url: body.stamp_url ?? null,
  };

  const { data: existing } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  let result;
  if (existing) {
    result = await supabase
      .from("businesses")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
  } else {
    result = await supabase.from("businesses").insert(payload).select().single();
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }
  return NextResponse.json({ business: result.data });
}
