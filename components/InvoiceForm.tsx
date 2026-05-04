"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CustomerForm, EMPTY_CUSTOMER } from "@/app/customers/CustomerForm";

export type InvoiceFormLineItem = {
  description: string;
  qty: number;
  unit_price: number; // VAT-exclusive
  vat_rate: number;
};

type CustomerLite = {
  id: string;
  name: string;
  vat_number: string | null;
};

const VAT_RATE = 0.15;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export type NotesMode = "default" | "custom" | "hidden";

export interface InvoiceFormInitial {
  customer_id: string;
  line_items: InvoiceFormLineItem[];
  /** "YYYY-MM" — the month portion of the stored due_date, or empty. */
  due_month: string;
  doc_type?: "invoice" | "quotation";
  /** "default" inherits business notes, "custom" uses notes_text, "hidden" shows nothing. */
  notes_mode?: NotesMode;
  notes_text?: string;
}

export const EMPTY_INVOICE_FORM: InvoiceFormInitial = {
  customer_id: "",
  line_items: [
    { description: "", qty: 1, unit_price: 0, vat_rate: VAT_RATE },
  ],
  due_month: "",
  doc_type: "invoice",
  notes_mode: "default",
  notes_text: "",
};

interface Props {
  /** "create" = POST /api/invoices, "edit" = PATCH /api/invoices/:id */
  mode: "create" | "edit";
  /** Required in edit mode. */
  invoiceId?: string;
  initial?: InvoiceFormInitial;
}

export function InvoiceForm({ mode, invoiceId, initial }: Props) {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerLite[] | null>(null);
  const [customerId, setCustomerId] = useState<string>(
    initial?.customer_id ?? "",
  );
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [items, setItems] = useState<InvoiceFormLineItem[]>(
    initial?.line_items ?? EMPTY_INVOICE_FORM.line_items,
  );
  const [docType, setDocType] = useState<"invoice" | "quotation">(
    initial?.doc_type ?? "invoice"
  );
  const [dueMonth, setDueMonth] = useState<string>(initial?.due_month ?? "");
  const [notesMode, setNotesMode] = useState<NotesMode>(
    initial?.notes_mode ?? "default",
  );
  const [notesText, setNotesText] = useState<string>(initial?.notes_text ?? "");
  const [businessNotes, setBusinessNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Routing State
  const [routes, setRoutes] = useState<{ origin: string; destination: string; price: number }[]>([]);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [routeOrigin, setRouteOrigin] = useState("");
  const [routeDestination, setRouteDestination] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/customers")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setCustomers(data.customers ?? []);
      })
      .catch(() => {
        if (!cancelled) setCustomers([]);
      });
      
    fetch("/api/routes")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setRoutes(data.routes ?? []);
      })
      .catch(() => {});

    fetch("/api/businesses")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const def = data.business?.invoice_notes ?? "";
        setBusinessNotes(def);
        // Seed the custom textarea with the business default the first time
        // the user switches to "custom" — but only when they haven't typed
        // anything yet (i.e., create mode with no override loaded).
        if (mode === "create" && !initial?.notes_text) {
          setNotesText(def);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [mode, initial?.notes_text]);

  const subtotal = items.reduce((s, it) => s + it.qty * it.unit_price, 0);
  const vatAmount = items.reduce(
    (s, it) => s + it.qty * it.unit_price * it.vat_rate,
    0,
  );
  const total = subtotal + vatAmount;

  function updateItem(idx: number, patch: Partial<InvoiceFormLineItem>) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    );
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { description: "", qty: 1, unit_price: 0, vat_rate: VAT_RATE },
    ]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  // Derived Route State
  const origins = Array.from(new Set(routes.map(r => r.origin)));
  const availableDestinations = routes.filter(r => r.origin === routeOrigin).map(r => r.destination);
  const selectedRoutePrice = routes.find(r => r.origin === routeOrigin && r.destination === routeDestination)?.price ?? 0;

  function addRouteItem() {
    if (!routeOrigin || !routeDestination) return;
    setItems(prev => [
      ...prev,
      { 
        description: `نقل حمولة (مسار: ${routeOrigin} - ${routeDestination})`, 
        qty: 1, 
        unit_price: selectedRoutePrice, 
        vat_rate: VAT_RATE 
      }
    ]);
    setShowRouteModal(false);
    setRouteOrigin("");
    setRouteDestination("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!customerId) {
      setError("اختر عميلاً أو أنشئ عميلاً جديداً.");
      return;
    }
    if (items.length === 0) {
      setError("أضف بنداً واحداً على الأقل.");
      return;
    }
    for (const it of items) {
      if (!it.description.trim()) {
        setError("كل بند يحتاج وصفاً.");
        return;
      }
      if (it.qty <= 0) {
        setError("الكمية يجب أن تكون أكبر من صفر.");
        return;
      }
      if (it.unit_price < 0) {
        setError("السعر لا يمكن أن يكون سالباً.");
        return;
      }
    }

    // Convert "YYYY-MM" → "YYYY-MM-01" for the DATE column.
    const dueDate =
      dueMonth && /^\d{4}-\d{2}$/.test(dueMonth) ? `${dueMonth}-01` : null;

    setSaving(true);
    try {
      const url =
        mode === "edit" && invoiceId
          ? `/api/invoices/${invoiceId}`
          : "/api/invoices";
      const method = mode === "edit" ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          due_date: dueDate,
          line_items: items.map((it) => ({
            description: it.description.trim(),
            qty: it.qty,
            unit_price: it.unit_price,
            vat_rate: it.vat_rate,
          })),
          doc_type: docType,
          source: "text",
          notes_override:
            notesMode === "custom" ? notesText : null,
          hide_notes: notesMode === "hidden",
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (res.status === 402) {
          throw new Error(
            j.message || "انتهت باقتك المجانية. يرجى الاشتراك للمتابعة.",
          );
        }
        if (res.status === 400 && j.error === "missing_business") {
          throw new Error("أكمل بيانات المنشأة أولاً من صفحة الإعدادات.");
        }
        throw new Error(j.details || j.error || "تعذّر حفظ الفاتورة.");
      }
      const { invoice } = await res.json();
      router.push(`/invoices/${invoice.id}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-8 bg-white/80 backdrop-blur-md rounded-3xl border border-slate-100 p-8 shadow-sm"
    >
      {/* Document Type Picker */}
      {mode === "create" && (
        <div className="space-y-3">
          <h2 className="font-bold">نوع المستند</h2>
          <div className="flex gap-4">
            <label className={`flex-1 border p-4 rounded-xl cursor-pointer text-center font-bold transition-all ${docType === "invoice" ? "border-brand bg-brand/5 text-brand ring-1 ring-brand" : "border-slate-100 hover:bg-slate-50 text-slate-500"}`}>
              <input type="radio" value="invoice" className="hidden" checked={docType === "invoice"} onChange={() => setDocType("invoice")} />
               فاتورة ضريبية
            </label>
            <label className={`flex-1 border p-4 rounded-xl cursor-pointer text-center font-bold transition-all ${docType === "quotation" ? "border-brand bg-brand/5 text-brand ring-1 ring-brand" : "border-slate-100 hover:bg-slate-50 text-slate-500"}`}>
              <input type="radio" value="quotation" className="hidden" checked={docType === "quotation"} onChange={() => setDocType("quotation")} />
              عرض سعر
            </label>
          </div>
        </div>
      )}

      {/* Customer picker */}
      <div className="space-y-3">
        <h2 className="font-bold">العميل</h2>
        {customers === null ? (
          <div className="text-sm text-gray-500">جارٍ تحميل العملاء...</div>
        ) : (
          <>
            <div className="flex gap-3 items-center">
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                disabled={saving || showQuickAdd}
                className="flex-1 px-4 py-3.5 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all outline-none"
              >
                <option value="">— اختر عميلاً —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.vat_number ? ` (${c.vat_number})` : ""}
                  </option>
                ))}
              </select>
              {!showQuickAdd && (
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(true)}
                  disabled={saving}
                  className="px-5 py-3.5 rounded-xl border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all whitespace-nowrap"
                >
                  + عميل جديد
                </button>
              )}
            </div>

            {showQuickAdd && (
              <div className="rounded-lg border border-brand/30 bg-brand/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">إضافة عميل جديد</h3>
                  <button
                    type="button"
                    onClick={() => setShowQuickAdd(false)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    إلغاء
                  </button>
                </div>
                <CustomerForm
                  initial={EMPTY_CUSTOMER}
                  submitLabel="إضافة العميل"
                  onSaved={(c) => {
                    setCustomers((prev) => [
                      {
                        id: c.id,
                        name: c.name,
                        vat_number: c.vat_number || null,
                      },
                      ...(prev ?? []),
                    ]);
                    setCustomerId(c.id);
                    setShowQuickAdd(false);
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Due date (month + year) */}
      <div className="space-y-2">
        <h2 className="font-bold">تاريخ الاستحقاق</h2>
        <p className="text-xs text-gray-500">
          اختياري — الشهر والسنة فقط
        </p>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={dueMonth}
            onChange={(e) => setDueMonth(e.target.value)}
            disabled={saving}
            className="px-4 py-3.5 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all outline-none font-mono"
          />
          {dueMonth && (
            <button
              type="button"
              onClick={() => setDueMonth("")}
              disabled={saving}
              className="text-sm text-red-600 hover:underline"
            >
              إزالة
            </button>
          )}
        </div>
      </div>

      {/* Line items */}
      <div className="space-y-3">
        <h2 className="font-bold">البنود</h2>
        {items.map((it, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-100 bg-white p-5 space-y-4 hover:shadow-sm hover:border-slate-200 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-600">
                بند {i + 1}
              </span>
              <button
                type="button"
                onClick={() => removeItem(i)}
                disabled={saving || items.length === 1}
                className="text-red-600 hover:text-red-800 disabled:opacity-30 text-sm"
              >
                حذف
              </button>
            </div>
            <label className="block">
              <span className="block text-xs text-gray-600 mb-1">الوصف</span>
              <input
                value={it.description}
                onChange={(e) => updateItem(i, { description: e.target.value })}
                disabled={saving}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all outline-none"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs text-gray-600 mb-1">
                  الكمية
                </span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={it.qty}
                  onChange={(e) =>
                    updateItem(i, { qty: e.target.value === "" ? 0 : Number(e.target.value) })
                  }
                  disabled={saving}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                />
              </label>
              <label className="block">
                <span className="block text-xs text-gray-600 mb-1">
                  السعر قبل الضريبة (ر.س)
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={it.unit_price}
                  onChange={(e) =>
                    updateItem(i, {
                      unit_price: Number(e.target.value) || 0,
                    })
                  }
                  disabled={saving}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                />
              </label>
            </div>
            <div className="text-xs text-gray-500 text-left">
              إجمالي البند:{" "}
              {round2(it.qty * it.unit_price * (1 + it.vat_rate)).toFixed(2)} ر.س
              شامل الضريبة
            </div>
          </div>
        ))}
        {showRouteModal && (
          <div className="rounded-2xl border border-brand/30 bg-brand/5 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-brand">إدراج تسعيرة مسار 🚚</h3>
              <button type="button" onClick={() => setShowRouteModal(false)} className="text-gray-500 hover:text-gray-700 text-sm">إلغاء</button>
            </div>
            {routes.length === 0 ? (
              <p className="text-sm text-gray-500">لم تقم بإضافة أي مسارات بعد. يمكنك إضافتها من صفحة الإعدادات.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">من (نقطة الانطلاق)</label>
                  <select value={routeOrigin} onChange={e => { setRouteOrigin(e.target.value); setRouteDestination(""); }} className="w-full px-3 py-2 rounded-xl bg-white border outline-none">
                    <option value="">— اختر —</option>
                    {origins.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">إلى (الوجهة)</label>
                  <select value={routeDestination} onChange={e => setRouteDestination(e.target.value)} disabled={!routeOrigin} className="w-full px-3 py-2 rounded-xl bg-white border outline-none disabled:opacity-50">
                    <option value="">— اختر —</option>
                    {availableDestinations.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            )}
            {routeDestination && (
              <div className="flex items-center justify-between mt-4">
                <span className="font-bold text-lg text-brand">{selectedRoutePrice} ر.س</span>
                <button type="button" onClick={addRouteItem} className="bg-brand text-white px-5 py-2 rounded-xl font-bold text-sm">إدراج البند</button>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="button"
            onClick={addItem}
            disabled={saving}
            className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            + بند يدوي
          </button>
          <button
            type="button"
            onClick={() => setShowRouteModal(true)}
            disabled={saving || showRouteModal}
            className="text-sm font-bold text-brand hover:text-brand-dark transition-colors"
          >
            + إدراج مسار 🚚
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-3">
        <h2 className="font-bold">ملاحظات الفاتورة</h2>
        <p className="text-xs text-gray-500">
          تظهر في أسفل الفاتورة. يمكنك استخدام النص الافتراضي من إعدادات
          المنشأة، أو كتابة ملاحظات خاصة بهذه الفاتورة، أو إخفائها كلياً.
        </p>

        <div className="space-y-2">
          <label
            className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
              notesMode === "default"
                ? "border-brand bg-brand/5 ring-1 ring-brand"
                : "border-slate-100 hover:bg-slate-50"
            }`}
          >
            <input
              type="radio"
              checked={notesMode === "default"}
              onChange={() => setNotesMode("default")}
              disabled={saving}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="text-sm font-semibold">
                استخدام الملاحظات الافتراضية
              </div>
              <div className="mt-1 whitespace-pre-wrap text-xs text-gray-500">
                {businessNotes
                  ? businessNotes
                  : "(لا توجد ملاحظات افتراضية في إعدادات المنشأة)"}
              </div>
            </div>
          </label>

          <label
            className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
              notesMode === "custom"
                ? "border-brand bg-brand/5 ring-1 ring-brand"
                : "border-slate-100 hover:bg-slate-50"
            }`}
          >
            <input
              type="radio"
              checked={notesMode === "custom"}
              onChange={() => setNotesMode("custom")}
              disabled={saving}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="text-sm font-semibold">
                ملاحظات مخصصة لهذه الفاتورة
              </div>
              {notesMode === "custom" && (
                <>
                  <textarea
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    disabled={saving}
                    rows={3}
                    maxLength={500}
                    placeholder="مثال: نقل بدائل اسمنت — مسار الرياض / الدمام"
                    className="mt-2 w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all outline-none text-sm"
                  />
                  <div className="mt-1 text-[11px] text-gray-400 text-left">
                    {notesText.length} / 500
                  </div>
                </>
              )}
            </div>
          </label>

          <label
            className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
              notesMode === "hidden"
                ? "border-brand bg-brand/5 ring-1 ring-brand"
                : "border-slate-100 hover:bg-slate-50"
            }`}
          >
            <input
              type="radio"
              checked={notesMode === "hidden"}
              onChange={() => setNotesMode("hidden")}
              disabled={saving}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="text-sm font-semibold">
                إخفاء الملاحظات في هذه الفاتورة
              </div>
              <div className="mt-1 text-xs text-gray-500">
                لن يظهر أي نص في تذييل الفاتورة.
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Totals */}
      <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">المجموع قبل الضريبة</span>
          <span className="font-semibold">{round2(subtotal).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">ضريبة القيمة المضافة (١٥٪)</span>
          <span className="font-semibold">{round2(vatAmount).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg border-t border-gray-200 pt-2">
          <span className="font-bold">الإجمالي شامل الضريبة</span>
          <span className="font-bold text-brand">
            {round2(total).toFixed(2)} ر.س
          </span>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving || !customerId || showQuickAdd}
        className="w-full py-4 rounded-xl bg-brand text-white font-bold text-lg hover:bg-brand-dark hover:shadow-lg hover:shadow-brand/30 hover:-translate-y-0.5 disabled:transform-none disabled:shadow-none disabled:opacity-50 transition-all duration-300"
      >
        {saving
          ? "جارٍ الحفظ..."
          : mode === "edit"
            ? "حفظ التعديلات"
            : "إنشاء الفاتورة"}
      </button>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}
    </form>
  );
}
