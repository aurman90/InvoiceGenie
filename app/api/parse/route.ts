import { NextResponse } from "next/server";
import { z } from "zod";
import { parseInvoiceFromArabic } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  text: z.string().min(1).max(2000),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (e) {
    return NextResponse.json(
      { error: "invalid_body", details: (e as Error).message },
      { status: 400 },
    );
  }

  try {
    const parsed = await parseInvoiceFromArabic(body.text);
    return NextResponse.json({ parsed });
  } catch (e) {
    return NextResponse.json(
      { error: "parse_failed", details: (e as Error).message },
      { status: 500 },
    );
  }
}
