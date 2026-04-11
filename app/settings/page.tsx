import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function saveBusiness(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const payload = {
    owner_id: user.id,
    name_ar: String(formData.get("name_ar") ?? "").trim(),
    name_en: String(formData.get("name_en") ?? "").trim() || null,
    vat_number: String(formData.get("vat_number") ?? "").trim(),
    address_ar: String(formData.get("address_ar") ?? "").trim() || null,
  };
  if (!payload.name_ar || !/^\d{15}$/.test(payload.vat_number)) {
    throw new Error("invalid_input");
  }

  const { data: existing } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("businesses").update(payload).eq("id", existing.id);
  } else {
    await supabase.from("businesses").insert(payload);
  }
  redirect("/dashboard");
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  return (
    <main className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold text-brand">
            InvoiceGenie
          </Link>
          <Link href="/dashboard" className="text-sm hover:text-brand">
            ← لوحة التحكم
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-bold mb-2">بيانات المنشأة</h1>
        <p className="text-gray-600 mb-8">
          تُستخدم هذه البيانات في كل فاتورة ورمز QR الخاص بـ ZATCA.
        </p>

        <form action={saveBusiness} className="space-y-5 bg-white rounded-xl border border-gray-200 p-6">
          <Field
            label="اسم المنشأة (عربي)"
            name="name_ar"
            required
            defaultValue={business?.name_ar ?? ""}
          />
          <Field
            label="Business name (English, optional)"
            name="name_en"
            defaultValue={business?.name_en ?? ""}
            dir="ltr"
          />
          <Field
            label="الرقم الضريبي (١٥ رقم)"
            name="vat_number"
            required
            defaultValue={business?.vat_number ?? ""}
            dir="ltr"
            pattern="\d{15}"
            placeholder="310122393500003"
          />
          <Field
            label="العنوان"
            name="address_ar"
            defaultValue={business?.address_ar ?? ""}
          />

          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-brand text-white font-semibold hover:bg-brand-dark transition"
          >
            حفظ
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  required,
  defaultValue,
  dir,
  pattern,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  dir?: "ltr" | "rtl";
  pattern?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-gray-700 mb-1">
        {label}
      </span>
      <input
        type="text"
        name={name}
        required={required}
        defaultValue={defaultValue}
        dir={dir}
        pattern={pattern}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-lg border border-gray-300"
      />
    </label>
  );
}
