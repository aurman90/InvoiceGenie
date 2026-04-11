import { NextResponse } from "next/server";
import { transcribeArabic } from "@/lib/whisper";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("audio");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_audio" }, { status: 400 });
  }

  try {
    const text = await transcribeArabic(file);
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json(
      { error: "transcribe_failed", details: (e as Error).message },
      { status: 500 },
    );
  }
}
