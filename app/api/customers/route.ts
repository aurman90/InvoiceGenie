import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { customerInputSchema } from "@/lib/customers";

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
    .from("customers")
    .select("id, name, address, commercial_register, vat_number, email, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ customers: data });
}

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
    body = customerInputSchema.parse(await request.json());
  } catch (e) {
    return NextResponse.json(
      { error: "invalid_body", details: (e as Error).message },
      { status: 400 },
    );
  }

  const { data: inserted, error } = await supabase
    .from("customers")
    .insert({
      owner_id: user.id,
      name: body.name,
      address: body.address ?? null,
      commercial_register: body.commercial_register ?? null,
      vat_number: body.vat_number ?? null,
      email: body.email ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ customer: inserted });
}
