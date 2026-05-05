"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";
import { buildZatcaQrBase64 } from "@/lib/zatca/tlv";
import { InvoiceLayout, type InvoiceTemplate } from "@/components/InvoiceLayout";

// Types for flexible settings
export type TextBlock = {
  id: string;
  position: "top" | "middle" | "bottom";
  content: string;
  alignment: "right" | "center" | "left";
};

export type InvoiceSettings = {
  showVatColumn: boolean;
  decimalPlaces: number; // 0, 1, 2, 3
  currency: string;
  showQrCode: boolean;
  textBlocks: TextBlock[];
  fontFamily?: string;
  labels?: Record<string, string>;
  hiddenFields?: string[];
};

const DEFAULT_SETTINGS: InvoiceSettings = {
  showVatColumn: true,
  decimalPlaces: 2,
  currency: "ر.س",
  showQrCode: true,
  textBlocks: [],
};

type StudioState = {
  name_ar: string;
  name_en: string;
  vat_number: string;
  address_ar: string;
  logo_url: string;
  brand_color: string;
  invoice_template: InvoiceTemplate;
  invoice_notes: string;
  stamp_url: string;
  invoice_settings: InvoiceSettings;
};

const EMPTY: StudioState = {
  name_ar: "",
  name_en: "",
  vat_number: "",
  address_ar: "",
  logo_url: "",
  brand_color: "#0f766e",
  invoice_template: "classic",
  invoice_notes: "",
  stamp_url: "",
  invoice_settings: DEFAULT_SETTINGS,
};

export default function InvoiceStudioPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"style" | "layout" | "labels">("style");
  const [values, setValues] = useState<StudioState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlag, setSavedFlag] = useState(false);

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
            stamp_url: data.business.stamp_url ?? "",
            invoice_settings: data.business.invoice_settings
              ? { ...DEFAULT_SETTINGS, ...data.business.invoice_settings }
              : DEFAULT_SETTINGS,
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, []);

  function patch<K extends keyof StudioState>(k: K, v: StudioState[K]) {
    setValues((prev) => ({ ...prev, [k]: v }));
    setSavedFlag(false);
  }

  function patchSettings<K extends keyof InvoiceSettings>(k: K, v: InvoiceSettings[K]) {
    setValues((prev) => ({
      ...prev,
      invoice_settings: { ...prev.invoice_settings, [k]: v },
    }));
    setSavedFlag(false);
  }

  function setLabel(key: string, val: string) {
    setValues((prev) => ({
      ...prev,
      invoice_settings: {
        ...prev.invoice_settings,
        labels: { ...prev.invoice_settings.labels, [key]: val }
      }
    }));
    setSavedFlag(false);
  }

  function toggleHidden(key: string) {
    setValues((prev) => {
      const h = prev.invoice_settings.hiddenFields || [];
      const isH = h.includes(key);
      const updated = isH ? h.filter(x => x !== key) : [...h, key];
      return {
        ...prev,
        invoice_settings: { ...prev.invoice_settings, hiddenFields: updated }
      };
    });
    setSavedFlag(false);
  }

  function addTextBlock() {
    patchSettings("textBlocks", [
      ...values.invoice_settings.textBlocks,
      { id: Date.now().toString(), position: "bottom", content: "", alignment: "right" },
    ]);
  }

  function removeTextBlock(id: string) {
    patchSettings(
      "textBlocks",
      values.invoice_settings.textBlocks.filter((b) => b.id !== id)
    );
  }

  function updateTextBlock(id: string, updates: Partial<TextBlock>) {
    patchSettings(
      "textBlocks",
      values.invoice_settings.textBlocks.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    setSavedFlag(false);
    try {
      // Create a payload compatible with the existing API.
      // The API endpoint needs to support updating invoice_settings.
      // We will assume the API takes body parameters and patches them.
      const res = await fetch("/api/businesses", {
        method: "POST", // The current api acts as upsert based on owner
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.details || j.error || "تعذّر الحفظ");
      }
      setSavedFlag(true);
      router.refresh();
      // Remove flag after 3 seconds
      setTimeout(() => setSavedFlag(false), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50/50 pb-20">
      <header className="sticky top-0 z-50 mt-4 mx-4 md:mx-auto md:max-w-7xl rounded-2xl bg-white/80 backdrop-blur-md border border-slate-100 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-extrabold text-slate-800">
            Invoice<span className="text-brand">Genie</span>
          </Link>
          <nav className="flex gap-6 text-sm">
            <Link href="/dashboard" className="text-slate-500 font-semibold hover:text-brand transition-colors">
              لوحة التحكم
            </Link>
            <Link href="/settings" className="text-slate-500 font-semibold hover:text-brand transition-colors">
              المنشأة
            </Link>
            <Link href="/templates" className="text-brand font-bold">
              استوديو الفواتير
            </Link>
            <Link href="/settings/routes" className="text-slate-500 font-semibold hover:text-brand transition-colors flex items-center gap-1 group">
              <span className="text-[10px] bg-brand text-white px-1.5 py-0.5 rounded-full font-bold group-hover:scale-110 transition-transform">جديد</span>
              المسارات
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">استوديو تنسيق الفواتير</h1>
          <p className="text-slate-500">تحكم بمرونة في أعمدة الفاتورة، النصوص الإضافية، والأختام التي ستظهر لعملائك.</p>
        </div>

        {loading ? (
          <div className="flex justify-center p-20 text-slate-400">جارٍ تهيئة الاستوديو...</div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
            {/* Editor Pane */}
            <div className="space-y-6">
              {/* Tabs Navbar */}
              <div className="flex gap-2 p-1.5 bg-slate-200/50 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setActiveTab("style")}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeTab === "style" ? "bg-white text-brand shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  }`}
                >
                  الخط والأرقام
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("layout")}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeTab === "layout" ? "bg-white text-brand shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  }`}
                >
                  تخطيط وإخفاء
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("labels")}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeTab === "labels" ? "bg-white text-brand shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  }`}
                >
                  الكلمات والنصوص
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
              {/* --- TAB: STYLE --- */}
              {activeTab === "style" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                  <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm space-y-6">
                    <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">تخصيص الخط (Typography)</h2>
                    <div className="grid grid-cols-3 gap-3">
                      {["Tajawal", "Cairo", "IBM Plex Sans Arabic"].map((font) => (
                        <label key={font} className={`border 2 border-slate-100 rounded-xl p-4 text-center cursor-pointer transition ${values.invoice_settings.fontFamily === font || (!values.invoice_settings.fontFamily && font === "Tajawal") ? "border-brand bg-brand/5 ring-1 ring-brand" : "hover:bg-slate-50"}`}>
                          <input
                            type="radio"
                            name="font"
                            className="hidden"
                            checked={values.invoice_settings.fontFamily === font || (!values.invoice_settings.fontFamily && font === "Tajawal")}
                            onChange={() => patchSettings("fontFamily", font)}
                          />
                          <span style={{ fontFamily: font }} className="block font-bold text-slate-800">{font}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm space-y-6">
                    <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">التقريب والعملة</h2>
                    <div className="grid grid-cols-2 gap-6">
                      <label className="block">
                        <span className="block text-sm font-bold text-slate-700 mb-2">التقريب العشري</span>
                        <select
                          value={values.invoice_settings.decimalPlaces}
                          onChange={(e) => patchSettings("decimalPlaces", Number(e.target.value))}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
                        >
                          <option value={1}>خانة واحدة (0.0)</option>
                          <option value={2}>خانتين (0.00)</option>
                          <option value={3}>ثلاث خانات (0.000)</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="block text-sm font-bold text-slate-700 mb-2">العملة (الرمز)</span>
                        <input
                          type="text"
                          value={values.invoice_settings.currency}
                          onChange={(e) => patchSettings("currency", e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm space-y-6">
                    <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">الختم والتوقيع الرسمي</h2>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">رابط صورة الختم (لو كان متاحاً لديك)</label>
                      <input
                        type="url"
                        value={values.stamp_url}
                        onChange={(e) => patch("stamp_url", e.target.value)}
                        placeholder="https://example.com/stamp.png"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
                        dir="ltr"
                      />
                      <p className="text-xs text-slate-500 mt-2">يفضل أن تكون صورة بخلفية شفافة (PNG). ستظهر أسفل إجمالي الفاتورة.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* --- TAB: LAYOUT --- */}
              {activeTab === "layout" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                  <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm space-y-6">
                    <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">محتويات مرئية</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition">
                        <input
                          type="checkbox"
                          checked={values.invoice_settings.showVatColumn}
                          onChange={(e) => patchSettings("showVatColumn", e.target.checked)}
                          className="w-5 h-5 text-brand rounded focus:ring-brand"
                        />
                        <div>
                          <div className="font-bold text-slate-800 text-sm">إظهار عمود ضريبة الصنف</div>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition">
                        <input
                          type="checkbox"
                          checked={values.invoice_settings.showQrCode}
                          onChange={(e) => patchSettings("showQrCode", e.target.checked)}
                          className="w-5 h-5 text-brand rounded focus:ring-brand"
                        />
                        <div>
                          <div className="font-bold text-slate-800 text-sm">إظهار باركود الزكاة (QR)</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm space-y-6">
                    <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">إخفاء حقول اختيارية</h2>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { key: "due_date", label: "تاريخ الاستحقاق" },
                        { key: "issue_date", label: "تاريخ الإصدار" },
                        { key: "seller_address", label: "عنوان المورد" },
                        { key: "customer_vat", label: "الرقم الضريبي للعميل" },
                      ].map((field) => {
                        const isHidden = (values.invoice_settings.hiddenFields || []).includes(field.key);
                        return (
                          <label key={field.key} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${isHidden ? "border-slate-300 bg-slate-100 opacity-60" : "border-slate-100 hover:bg-slate-50"}`}>
                            <input
                              type="checkbox"
                              checked={!isHidden}
                              onChange={() => toggleHidden(field.key)}
                              className="w-5 h-5 rounded focus:ring-brand text-brand"
                            />
                            <div className="font-bold text-slate-800 text-sm">عرض ({field.label})</div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* --- TAB: LABELS --- */}
              {activeTab === "labels" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                  <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm space-y-6">
                    <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">قاموس المسميات (Localization)</h2>
                    <p className="text-sm text-slate-500 mb-4">غيّر المسميات الافتراضية لأي شيء ليناسب طبيعة عملك (مثل تغيير "الوصف" إلى "الخدمة"). اترك الحقل فارغاً لاستخدام المسمى الافتراضي.</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">ترويسة الفاتورة (عربي)</label>
                        <input type="text" placeholder="فاتورة ضريبية إلكترونية" value={values.invoice_settings.labels?.tax_invoice_ar || ""} onChange={(e) => setLabel("tax_invoice_ar", e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">اسم عامود البيان</label>
                        <input type="text" placeholder="الوصف" value={values.invoice_settings.labels?.col_desc || ""} onChange={(e) => setLabel("col_desc", e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">اسم عامود الكمية</label>
                        <input type="text" placeholder="الكمية" value={values.invoice_settings.labels?.col_qty || ""} onChange={(e) => setLabel("col_qty", e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">اسم عامود السعر</label>
                        <input type="text" placeholder="السعر" value={values.invoice_settings.labels?.col_price || ""} onChange={(e) => setLabel("col_price", e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">إجمالي ما قبل الضريبة</label>
                        <input type="text" placeholder="المجموع قبل الضريبة" value={values.invoice_settings.labels?.totals_subtotal || ""} onChange={(e) => setLabel("totals_subtotal", e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">الصافي النهائي</label>
                        <input type="text" placeholder="الإجمالي" value={values.invoice_settings.labels?.totals_net || ""} onChange={(e) => setLabel("totals_net", e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Texts */}
                  <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h2 className="text-lg font-bold text-slate-800">صناديق نصوص حرة</h2>
                      <button type="button" onClick={addTextBlock} className="text-brand font-bold text-sm bg-brand/10 px-4 py-2 rounded-lg hover:bg-brand/20 transition">
                        + كتلة جديدة
                      </button>
                    </div>

                    {values.invoice_settings.textBlocks.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-xl">
                        لا يوجد كتل نصية. يمكنك إضافة ملاحظات، حسابات بنكية، أو رسالة ترحيبية.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {values.invoice_settings.textBlocks.map((block) => (
                          <div key={block.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 relative group">
                            <button type="button" onClick={() => removeTextBlock(block.id)} className="absolute top-4 left-4 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition">
                              يحذف
                            </button>
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">الموقع بالفاتورة</label>
                                <select
                                  value={block.position}
                                  onChange={(e) => updateTextBlock(block.id, { position: e.target.value as any })}
                                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                                >
                                  <option value="top">الأعلى (تحت الترويسة)</option>
                                  <option value="middle">المنتصف (فوق الجدول)</option>
                                  <option value="bottom">الأسفل (التذييل والشروط)</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">المحاذاة</label>
                                <select
                                  value={block.alignment}
                                  onChange={(e) => updateTextBlock(block.id, { alignment: e.target.value as any })}
                                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                                >
                                  <option value="right">يمين</option>
                                  <option value="center">وسط</option>
                                  <option value="left">يسار</option>
                                </select>
                              </div>
                            </div>
                            <textarea
                              value={block.content}
                              onChange={(e) => updateTextBlock(block.id, { content: e.target.value })}
                              placeholder="محتوى النص (مثال: البنك الأهلي - رقم الحساب...)"
                              rows={3}
                              className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm resize-none"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="sticky bottom-4 z-40 bg-white/90 backdrop-blur border border-slate-100 p-4 rounded-2xl shadow-lg flex items-center justify-between">
                <div>
                  {error && <span className="text-red-600 text-sm font-bold">{error}</span>}
                  {savedFlag && <span className="text-emerald-600 text-sm font-bold">تم حفظ الإعدادات بنجاح ✓</span>}
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-3 rounded-xl bg-brand text-white font-bold hover:bg-brand-dark hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50"
                >
                  {saving ? "جارٍ الحفظ..." : "حفظ إعدادات الاستوديو"}
                </button>
              </div>

            </form>
            </div>

            {/* Live Preview Pane */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold text-slate-800">معاينة مباشرة (Live Preview)</h2>
                <span className="text-xs font-bold text-brand bg-brand/10 px-2 py-1 rounded-full">A4</span>
              </div>
              <div className="rounded-3xl border-2 border-slate-200 bg-white shadow-xl p-4 overflow-hidden relative">
                {/* Simulated exact A4 scaled container */}
                <div className="mx-auto" style={{ width: "calc(210mm * 0.45)", height: "calc(297mm * 0.45)", pointerEvents: "none" }}>
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

// ---------- Helper for Live Preview ----------
function LivePreview({ values }: { values: StudioState }) {
  const [qr, setQr] = useState<string>("");

  const sampleInvoice = useMemo(
    () => ({
      number: "INV-00001",
      uuid: "00000000-0000-0000-0000-000000000000",
      issue_date: new Date().toISOString(),
      subtotal: 1000,
      vat_amount: 150,
      total: 1150,
      line_items: [
        { description: "استشارة فنية متخصصة", qty: 10, unit_price: 100, vat_rate: 0.15 },
      ],
    }),
    [],
  );

  useEffect(() => {
    if (!values.invoice_settings.showQrCode || !values.vat_number || !/^\d{15}$/.test(values.vat_number)) {
      setQr(""); return;
    }
    const payload = buildZatcaQrBase64({
      sellerName: values.name_ar || "—",
      vatNumber: values.vat_number,
      timestampIso: sampleInvoice.issue_date.replace(/\.\d{3}Z$/, "Z"),
      totalWithVat: sampleInvoice.total.toFixed(2),
      vatTotal: sampleInvoice.vat_amount.toFixed(2),
    });
    QRCode.toDataURL(payload, { errorCorrectionLevel: "M", margin: 1, width: 220 }).then(setQr).catch(() => setQr(""));
  }, [values.name_ar, values.vat_number, sampleInvoice, values.invoice_settings.showQrCode]);

  return (
    <InvoiceLayout
      mode="thumbnail"
      seller={{
        name_ar: values.name_ar || "[اسم المنشأة]",
        name_en: values.name_en || undefined,
        vat_number: values.vat_number || "310000000000003",
        address_ar: values.address_ar || undefined,
        logo_url: values.logo_url || undefined,
      }}
      customer={{ name: "شركة أمثلة المحدودة" }}
      invoice={sampleInvoice}
      qrDataUrl={qr}
      brandColor={values.brand_color}
      template={values.invoice_template}
      notes={values.invoice_notes || undefined}
      // Pass the new studio settings directly to layout
      invoiceSettings={values.invoice_settings}
      stampUrl={values.stamp_url}
    />
  );
}
