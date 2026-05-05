import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Load quotation
  const { data: existing, error: exErr } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (exErr || !existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (existing.doc_type !== "quotation") {
    return NextResponse.json({ error: "not_a_quotation" }, { status: 400 });
  }

  // Generate new INV- number preserving everything else
  const { count: existingCount } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("business_id", existing.business_id)
    .eq("doc_type", "invoice");
    
  const invoiceNumber = `INV-${String((existingCount ?? 0) + 1).padStart(5, "0")}`;

  const { data, error } = await supabase
    .from("invoices")
    .update({ 
      doc_type: "invoice",
      invoice_number: invoiceNumber,
      status: "unpaid" 
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ invoice: data });
}
