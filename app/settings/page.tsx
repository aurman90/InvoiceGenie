"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";
import { buildZatcaQrBase64 } from "@/lib/zatca/tlv";
import {
  InvoiceLayout,
  type InvoiceTemplate,
} from "@/components/InvoiceLayout";

const TEMPLATES: { id: InvoiceTemplate; label: string; hint: string }[] = [
  { id: "classic", label: "كلاسيكي", hint: "إطار وعنوان ملوّن — التقليدي" },
  { id: "modern", label: "عصري", hint: "شريط علوي ملوّن مع الشعار" },
  { id: "minimal", label: "بسيط", hint: "بدون ألوان — أبيض وأسود فقط" },
];

const PRESET_COLORS = [
  "#0f766e", // teal (default brand)
  "#1e40af", // blue
  "#7c3aed", // purple
  "#b91c1c", // red
  "#c2410c", // orange
  "#15803d", // green
  "#a16207", // yellow
  "#1f2937", // gray
];

type FormState = {
  name_ar: string;
  name_en: string;
  vat_number: string;
  address_ar: string;
  logo_url: string;
  brand_color: string;
  invoice_template: InvoiceTemplate;
  invoice_notes: string;
};

const EMPTY: FormState = {
  name_ar: "",
  name_en: "",
  vat_number: "",
  address_ar: "",
  logo_url: "",
  brand_color: "#0f766e",
  invoice_template: "classic",
  invoice_notes: "",
};

export default function SettingsPage() {
  const router = useRouter();
  const [values, setValues] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlag, setSavedFlag] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load current business on mount.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/businesses")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.business) {
          setValues({
            name_ar: data.business.name_ar ?? "",
            name_en: data.business.name_en ?? "",
            vat_number: data.business.vat_number ?? "",
            address_ar: data.business.address_ar ?? "",
            logo_url: data.business.logo_url ?? "",
            brand_color: data.business.brand_color ?? "#0f766e",
            invoice_template: data.business.invoice_template ?? "classic",
            invoice_notes: data.business.invoice_notes ?? "",
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  function patch(k: keyof FormState, v: string) {
    setValues((prev) => ({ ...prev, [k]: v }));
    setSavedFlag(false);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("حجم الشعار يجب أن يكون أقل من ٢ ميجابايت");
      return;
    }
    setError(null);
    setUploadingLogo(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("يرجى تسجيل الدخول أولاً");

      // Normalize the extension — user-supplied filenames (especially Arabic
      // screenshot names with spaces/dots) can produce weird paths. We force
      // the extension to a known image suffix based on the MIME type.
      const mimeExt: Record<string, string> = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/svg+xml": "svg",
        "image/webp": "webp",
      };
      const ext = mimeExt[file.type] ?? "png";
      const path = `${user.id}/logo-${Date.now()}.${ext}`;
      // upsert=false: each filename carries a fresh timestamp, so there is
      // never a conflict, and we avoid the upsert policy trap where RLS
      // checks both INSERT *and* UPDATE policies simultaneously.
      const { error: upErr } = await supabase.storage
        .from("logos")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from("logos")
        .getPublicUrl(path);
      patch("logo_url", urlData.publicUrl);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!values.name_ar.trim()) {
      setError("اسم المنشأة مطلوب");
      return;
    }
    if (!/^\d{15}$/.test(values.vat_number.trim())) {
      setError("الرقم الضريبي يجب أن يكون ١٥ رقماً");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.details || j.error || "تعذّر الحفظ");
      }
      setSavedFlag(true);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-50 mt-4 mx-4 md:mx-auto md:max-w-7xl rounded-2xl bg-white/80 backdrop-blur-md border border-slate-100 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-extrabold text-slate-800">
            Invoice<span className="text-brand">Genie</span>
          </Link>
          <nav className="flex gap-6 text-sm">
            <Link href="/dashboard" className="text-slate-500 font-semibold hover:text-brand transition-colors">
              لوحة التحكم
            </Link>
            <Link href="/customers" className="text-slate-500 font-semibold hover:text-brand transition-colors">
              العملاء
            </Link>
            <Link href="/settings" className="text-brand font-bold">
              المنشأة
            </Link>
            <Link href="/templates" className="text-slate-500 font-semibold hover:text-brand transition-colors">
              استوديو الفواتير
            </Link>
            <Link href="/settings/routes" className="text-slate-500 font-semibold text-brand transition-colors flex items-center gap-1 group">
              <span className="text-[10px] bg-brand text-white px-1.5 py-0.5 rounded-full font-bold group-hover:scale-110 transition-transform">جديد</span>
              المسارات
            </Link>
            <form action="/api/auth/signout" method="post">
              <button type="submit" className="text-slate-500 font-semibold hover:text-red-500 transition-colors">
                خروج
              </button>
            </form>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="text-3xl font-bold mb-2">إعدادات المنشأة والفاتورة</h1>
        <p className="text-gray-600 mb-8">
          عدّل بيانات منشأتك وتصميم الفاتورة. المعاينة على اليسار تتحدّث فوراً.
        </p>

        {loading ? (
          <div className="text-gray-500">جارٍ التحميل...</div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
            {/* ---------- Form ---------- */}
            <form
              onSubmit={handleSave}
              className="space-y-8 bg-white/80 backdrop-blur-md rounded-3xl border border-slate-100 p-8 shadow-sm"
            >
              <Section title="بيانات المنشأة">
                <Field
                  label="اسم المنشأة (عربي)"
                  required
                  value={values.name_ar}
                  onChange={(v) => patch("name_ar", v)}
                />
                <Field
                  label="Business name (English)"
                  value={values.name_en}
                  onChange={(v) => patch("name_en", v)}
                  dir="ltr"
                />
                <Field
                  label="الرقم الضريبي (١٥ رقم)"
                  required
                  value={values.vat_number}
                  onChange={(v) => patch("vat_number", v)}
                  dir="ltr"
                  placeholder="310122393500003"
                  mono
                />
                <Field
                  label="العنوان"
                  value={values.address_ar}
                  onChange={(v) => patch("address_ar", v)}
                />
              </Section>

              <Section title="تصميم الفاتورة">
                {/* Logo upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    شعار المنشأة
                  </label>
                  <div className="flex items-center gap-4">
                    {values.logo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={values.logo_url}
                        alt="logo preview"
                        className="h-16 w-16 rounded border border-gray-200 object-contain bg-gray-50"
                      />
                    )}
                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo || saving}
                        className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-brand file:text-white file:font-semibold file:cursor-pointer file:hover:bg-brand-dark"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        PNG / JPG / SVG — أقل من ٢ ميجابايت
                      </p>
                      {uploadingLogo && (
                        <p className="mt-1 text-xs text-brand">
                          جارٍ رفع الصورة...
                        </p>
                      )}
                      {values.logo_url && (
                        <button
                          type="button"
                          onClick={() => patch("logo_url", "")}
                          className="mt-1 text-xs text-red-600 hover:underline"
                        >
                          إزالة الشعار
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Brand color */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    لون العلامة التجارية
                  </label>
                  <div className="flex flex-wrap gap-2 items-center">
                    {PRESET_COLORS.map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => patch("brand_color", c)}
                        className={`w-9 h-9 rounded-lg border-2 transition ${
                          values.brand_color === c
                            ? "border-gray-900 scale-110"
                            : "border-gray-200 hover:border-gray-400"
                        }`}
                        style={{ background: c }}
                        title={c}
                      />
                    ))}
                    <input
                      type="color"
                      value={values.brand_color}
                      onChange={(e) => patch("brand_color", e.target.value)}
                      className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                      title="لون مخصص"
                    />
                    <span className="font-mono text-xs text-gray-600">
                      {values.brand_color}
                    </span>
                  </div>
                </div>

                {/* Template */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    نموذج الفاتورة
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {TEMPLATES.map((t) => (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => patch("invoice_template", t.id)}
                        className={`rounded-lg border-2 p-3 text-right transition ${
                          values.invoice_template === t.id
                            ? "border-brand bg-brand/5"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="font-semibold">{t.label}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {t.hint}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ملاحظات / شروط (تظهر أسفل كل فاتورة)
                  </label>
                  <textarea
                    value={values.invoice_notes}
                    onChange={(e) => patch("invoice_notes", e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="مثال: الدفع خلال ٣٠ يوماً من تاريخ الإصدار. شكراً لتعاملكم معنا."
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 resize-none"
                  />
                  <p className="mt-1 text-xs text-gray-500 text-left">
                    {values.invoice_notes.length} / 500
                  </p>
                </div>
              </Section>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                  {error}
                </div>
              )}
              {savedFlag && !error && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
                  تم الحفظ ✓
                </div>
              )}

              <button
                type="submit"
                disabled={saving || uploadingLogo}
                className="w-full py-3 rounded-lg bg-brand text-white font-semibold hover:bg-brand-dark disabled:opacity-50 transition"
              >
                {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
              </button>
            </form>

            {/* ---------- Live Preview ---------- */}
            <div className="lg:sticky lg:top-4 lg:self-start">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold">معاينة مباشرة</h2>
                <span className="text-xs text-gray-500">A4 — ٢١٠×٢٩٧ مم</span>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 overflow-hidden">
                <div
                  className="mx-auto"
                  style={{
                    width: "calc(210mm * 0.45)",
                    height: "calc(297mm * 0.45)",
                  }}
                >
                  <LivePreview values={values} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// ---------- Helpers ----------

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <h2 className="font-bold text-lg border-b border-gray-200 pb-2">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  value,
  onChange,
  dir,
  placeholder,
  mono,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  dir?: "ltr" | "rtl";
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        dir={dir}
        placeholder={placeholder}
        className={`w-full px-4 py-3 rounded-lg border border-gray-300 ${
          mono ? "font-mono" : ""
        }`}
      />
    </label>
  );
}

/**
 * Renders a fake invoice with the current form values so the user sees
 * design changes instantly, before saving.
 */
function LivePreview({ values }: { values: FormState }) {
  const [qr, setQr] = useState<string>("");

  const sampleInvoice = useMemo(
    () => ({
      number: "INV-00001",
      uuid: "00000000-0000-0000-0000-000000000000",
      issue_date: new Date().toISOString(),
      subtotal: 434.78,
      vat_amount: 65.22,
      total: 500,
      line_items: [
        { description: "خدمة تجريبية", qty: 1, unit_price: 434.78, vat_rate: 0.15 },
      ],
    }),
    [],
  );

  useEffect(() => {
    if (!values.vat_number || !/^\d{15}$/.test(values.vat_number)) {
      setQr("");
      return;
    }
    try {
      const payload = buildZatcaQrBase64({
        sellerName: values.name_ar || "—",
        vatNumber: values.vat_number,
        timestampIso: sampleInvoice.issue_date.replace(/\.\d{3}Z$/, "Z"),
        totalWithVat: sampleInvoice.total.toFixed(2),
        vatTotal: sampleInvoice.vat_amount.toFixed(2),
      });
      QRCode.toDataURL(payload, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 220,
      }).then(setQr);
    } catch {
      setQr("");
    }
  }, [values.name_ar, values.vat_number, sampleInvoice]);

  return (
    <InvoiceLayout
      mode="thumbnail"
      seller={{
        name_ar: values.name_ar || "اسم المنشأة",
        name_en: values.name_en || undefined,
        vat_number: values.vat_number || "———————————————",
        address_ar: values.address_ar || undefined,
        logo_url: values.logo_url || undefined,
      }}
      customer={{ name: "عميل تجريبي" }}
      invoice={sampleInvoice}
      qrDataUrl={qr}
      brandColor={values.brand_color}
      template={values.invoice_template}
      notes={values.invoice_notes || undefined}
    />
  );
}
