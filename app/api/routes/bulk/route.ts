import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bulkSchema = z.array(z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  price: z.number().nonnegative(),
}));

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!business) {
    return NextResponse.json({ error: "missing_business" }, { status: 400 });
  }

  let body: z.infer<typeof bulkSchema>;
  try {
    body = bulkSchema.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (body.length === 0) {
    return NextResponse.json({ error: "empty_array" }, { status: 400 });
  }

  // Add business_id to all items
  const inserts = body.map(r => ({
    business_id: business.id,
    origin: r.origin,
    destination: r.destination,
    price: r.price,
  }));

  // We use ON CONFLICT DO UPDATE to ensure we don't break if a route already exists.
  // Wait, Supabase `upsert` handles on conflict nicely.
  const { data, error } = await supabase
    .from("routes")
    .upsert(inserts, { onConflict: "business_id,origin,destination" })
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ insertedCount: inserts.length });
}
