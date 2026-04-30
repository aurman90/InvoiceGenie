"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { buildZatcaQrBase64 } from "@/lib/zatca/tlv";

type LineItem = {
  description: string;
  qty: number;
  unitPrice: number; // VAT-exclusive
};

const VAT_RATE = 0.15;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function fmt(n: number) {
  return n.toFixed(2);
}

/**
 * Very small Arabic-text → invoice parser used only for the offline demo.
 * Not a replacement for the Claude parser — just enough to make a 1-line
 * sentence like "فاتورة لأحمد 500 ريال مقابل دهان" fill in the form.
 */
function demoParse(text: string): {
  customerName?: string;
  amount?: number;
  description?: string;
} {
  const out: {
    customerName?: string;
    amount?: number;
    description?: string;
  } = {};

  // Normalize Arabic/Persian digits to ASCII.
  const normalized = text.replace(/[\u0660-\u0669\u06f0-\u06f9]/g, (d) => {
    const code = d.charCodeAt(0);
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });

  const amountMatch = normalized.match(/(\d+(?:\.\d+)?)/);
  if (amountMatch) out.amount = parseFloat(amountMatch[1]);

  const customerMatch = normalized.match(/ل([^\s0-9]+)/);
  if (customerMatch) out.customerName = customerMatch[1];

  const descMatch = normalized.match(/مقابل\s+(.+?)\s*$/);
  if (descMatch) out.description = descMatch[1].trim();

  return out;
}

export default function DemoPage() {
  const [sellerName, setSellerName] = useState("شركة التجربة");
  const [vatNumber, setVatNumber] = useState("310122393500003");
  const [customerName, setCustomerName] = useState("أحمد");
  const [sentence, setSentence] = useState(
    "فاتورة لأحمد 500 ريال مقابل دهان",
  );
  const [items, setItems] = useState<LineItem[]>([
    { description: "دهان", qty: 1, unitPrice: 500 / 1.15 },
  ]);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [qrPayload, setQrPayload] = useState<string>("");
  const [issueDate] = useState(() => new Date());

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, it) => sum + it.qty * it.unitPrice,
      0,
    );
    const vat = subtotal * VAT_RATE;
    const total = subtotal + vat;
    return {
      subtotal: round2(subtotal),
      vat: round2(vat),
      total: round2(total),
    };
  }, [items]);

  // Build QR whenever inputs change.
  useEffect(() => {
    let cancelled = false;
    const fields = {
      sellerName: sellerName || "—",
      vatNumber: vatNumber || "—",
      timestampIso: issueDate.toISOString().replace(/\.\d{3}Z$/, "Z"),
      totalWithVat: fmt(totals.total),
      vatTotal: fmt(totals.vat),
    };
    try {
      const payload = buildZatcaQrBase64(fields);
      QRCode.toDataURL(payload, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 220,
      }).then((url) => {
        if (!cancelled) {
          setQrDataUrl(url);
          setQrPayload(payload);
        }
      });
    } catch {
      if (!cancelled) {
        setQrDataUrl("");
        setQrPayload("");
      }
    }
    return () => {
      cancelled = true;
    };
  }, [sellerName, vatNumber, totals.total, totals.vat, issueDate]);

  function applyParse() {
    const parsed = demoParse(sentence);
    if (parsed.customerName) setCustomerName(parsed.customerName);
    if (parsed.amount !== undefined) {
      // Treat typed amount as VAT-inclusive (same convention as /new).
      const unit = parsed.amount / (1 + VAT_RATE);
      setItems([
        {
          description: parsed.description || items[0]?.description || "خدمة",
          qty: 1,
          unitPrice: round2(unit),
        },
      ]);
    } else if (parsed.description) {
      setItems((prev) => [
        { ...prev[0], description: parsed.description! },
        ...prev.slice(1),
      ]);
    }
  }

  function updateItem(idx: number, patch: Partial<LineItem>) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    );
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { description: "بند جديد", qty: 1, unitPrice: 0 },
    ]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 mt-4 mx-4 md:mx-auto md:max-w-[calc(210mm+4rem)] rounded-2xl bg-white/80 backdrop-blur-md border border-slate-100 shadow-sm print:hidden">
        <div className="px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-extrabold text-slate-800">
            Invoice<span className="text-brand">Genie</span>
          </Link>
          <div className="text-sm font-semibold text-slate-500 hidden sm:block">وضع التجربة</div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8 grid md:grid-cols-2 gap-8">
        {/* ---------- Input side ---------- */}
        <section className="space-y-6 print:hidden">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-bold text-lg">بيانات المنشأة</h2>
            <label className="block">
              <span className="text-sm text-gray-600">اسم المنشأة</span>
              <input
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300"
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">
                الرقم الضريبي (١٥ رقم)
              </span>
              <input
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 font-mono"
              />
            </label>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-bold text-lg">
              إدخال سريع (اختياري)
            </h2>
            <p className="text-sm text-gray-600">
              اكتب جملة عربية واضغط &ldquo;استخراج&rdquo; — سيملأ الحقول
              تلقائياً.
            </p>
            <textarea
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-300"
            />
            <button
              type="button"
              onClick={applyParse}
              className="px-4 py-2 rounded-lg bg-brand text-white font-semibold hover:bg-brand-dark"
            >
              استخراج البيانات
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-bold text-lg">العميل والبنود</h2>
            <label className="block">
              <span className="text-sm text-gray-600">اسم العميل</span>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300"
              />
            </label>

            <div className="space-y-3">
              {items.map((it, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_80px_110px_auto] gap-2 items-end"
                >
                  <label className="block">
                    <span className="text-xs text-gray-500">الوصف</span>
                    <input
                      value={it.description}
                      onChange={(e) =>
                        updateItem(i, { description: e.target.value })
                      }
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-500">الكمية</span>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={it.qty}
                      onChange={(e) =>
                        updateItem(i, { qty: e.target.value === "" ? 0 : Number(e.target.value) })
                      }
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-500">
                      السعر (قبل ض)
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={it.unitPrice}
                      onChange={(e) =>
                        updateItem(i, {
                          unitPrice: Number(e.target.value) || 0,
                        })
                      }
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    disabled={items.length === 1}
                    className="text-red-600 hover:text-red-800 disabled:opacity-30 text-sm px-2"
                    title="حذف"
                  >
                    حذف
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addItem}
              className="text-sm text-brand hover:underline"
            >
              + إضافة بند
            </button>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="w-full py-3 rounded-lg bg-brand text-white font-semibold hover:bg-brand-dark"
          >
            تحميل / طباعة PDF
          </button>
        </section>

        {/* ---------- Invoice preview ---------- */}
        <section>
          <div className="bg-white rounded-xl border border-gray-200 p-8 print:border-0 print:rounded-none print:p-0">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-brand">
                  فاتورة ضريبية مبسطة
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Simplified Tax Invoice
                </p>
              </div>
              {qrDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="ZATCA QR"
                  className="w-[140px] h-[140px]"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div>
                <div className="text-gray-500">المورّد</div>
                <div className="font-semibold">{sellerName}</div>
                <div className="font-mono text-xs text-gray-600">
                  الرقم الضريبي: {vatNumber}
                </div>
              </div>
              <div>
                <div className="text-gray-500">العميل</div>
                <div className="font-semibold">{customerName}</div>
                <div className="text-xs text-gray-600">
                  التاريخ: {issueDate.toLocaleString("ar-SA")}
                </div>
              </div>
            </div>

            <table className="w-full text-right mb-6 text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">الوصف</th>
                  <th className="px-3 py-2 font-semibold">الكمية</th>
                  <th className="px-3 py-2 font-semibold">السعر</th>
                  <th className="px-3 py-2 font-semibold">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-3 py-2">{it.description}</td>
                    <td className="px-3 py-2">{it.qty}</td>
                    <td className="px-3 py-2">{fmt(it.unitPrice)}</td>
                    <td className="px-3 py-2">
                      {fmt(round2(it.qty * it.unitPrice))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="shadow-sm border border-slate-100 rounded-lg overflow-hidden bg-white mx-auto p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">المجموع قبل الضريبة</span>
                <span className="font-semibold">{fmt(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">
                  ضريبة القيمة المضافة (١٥٪)
                </span>
                <span className="font-semibold">{fmt(totals.vat)}</span>
              </div>
              <div className="flex justify-between text-lg border-t border-gray-200 pt-2">
                <span className="font-bold">الإجمالي شامل الضريبة</span>
                <span className="font-bold text-brand">
                  {fmt(totals.total)} ر.س
                </span>
              </div>
            </div>

            {qrPayload && (
              <details className="mt-6 text-xs text-gray-500 print:hidden">
                <summary className="cursor-pointer">
                  حمولة QR (TLV Base64)
                </summary>
                <code className="break-all block mt-2 font-mono">
                  {qrPayload}
                </code>
              </details>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
