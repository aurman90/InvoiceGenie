/**
 * Shared A4 invoice layout — used by both the settings preview
 * and the /invoices/[id] detail page. Pure component, no data fetching.
 *
 * Supports three templates (classic, modern, minimal) and a brand color
 * that tints headings, rule lines, and totals. The entire card is sized
 * to A4 (210×297mm) so what the user sees on screen matches what prints.
 *
 * Auto-fit: if the content is taller than the usable A4 area, the card
 * scales down (via CSS transform) so it still occupies exactly one page.
 */
"use client";

import { useEffect, useRef, useState } from "react";

export type InvoiceTemplate = "classic" | "modern" | "minimal";

export interface InvoiceLayoutLineItem {
  description: string;
  qty: number;
  unit_price: number;
  vat_rate?: number;
}

export interface InvoiceLayoutProps {
  seller: {
    name_ar: string;
    name_en?: string | null;
    vat_number: string;
    address_ar?: string | null;
    logo_url?: string | null;
  };
  customer: {
    name: string;
    vat_number?: string | null;
  };
  invoice: {
    number: string;
    uuid: string;
    issue_date: string; // ISO
    /** Optional due date (first day of the due month). */
    due_date?: string | null;
    subtotal: number;
    vat_amount: number;
    total: number;
    line_items: InvoiceLayoutLineItem[];
  };
  /** PNG data URL of the QR code. */
  qrDataUrl: string;
  brandColor: string;
  template: InvoiceTemplate;
  notes?: string | null;
  /**
   * Rendering mode.
   *  - "page": absolute A4 dimensions with auto-fit scaling — used for
   *    the on-screen preview and the printable detail page.
   *  - "thumbnail": same layout but at a fixed smaller scale — used for
   *    the live preview side panel on /settings so it fits in the column.
   */
  mode?: "page" | "thumbnail";
}

// A4 in CSS: 210×297mm. Usable print area with 12mm margins (globals.css).
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const PAGE_PADDING_MM = 14;

function fmt(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function InvoiceLayout({
  seller,
  customer,
  invoice,
  qrDataUrl,
  brandColor,
  template,
  notes,
  mode = "page",
}: InvoiceLayoutProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Auto-shrink content so the whole invoice stays on one A4 page.
  useEffect(() => {
    if (mode !== "page") return;
    const el = contentRef.current;
    if (!el) return;

    const measure = () => {
      // Reset scale before measuring natural height
      el.style.transform = "scale(1)";
      const naturalHeight = el.scrollHeight;
      const usableMm = A4_HEIGHT_MM - PAGE_PADDING_MM * 2;
      const usablePx = (usableMm / 25.4) * 96; // mm → px at 96dpi
      if (naturalHeight > usablePx) {
        const s = Math.max(0.5, usablePx / naturalHeight);
        setScale(s);
      } else {
        setScale(1);
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mode, template, notes, invoice.line_items.length]);

  // ---------- style helpers ----------
  const isModern = template === "modern";
  const isMinimal = template === "minimal";
  const isClassic = template === "classic";

  const pageStyle: React.CSSProperties =
    mode === "page"
      ? {
        width: `${A4_WIDTH_MM}mm`,
        height: `${A4_HEIGHT_MM}mm`,
        padding: `${PAGE_PADDING_MM}mm`,
        background: "white",
        color: "#111827",
        boxSizing: "border-box",
        overflow: "hidden",
        position: "relative",
      }
      : {
        width: `${A4_WIDTH_MM}mm`,
        height: `${A4_HEIGHT_MM}mm`,
        padding: `${PAGE_PADDING_MM}mm`,
        background: "white",
        color: "#111827",
        boxSizing: "border-box",
        overflow: "hidden",
        transform: "scale(0.45)",
        transformOrigin: "top right",
      };

  const ruleColor = isMinimal ? "#d1d5db" : brandColor;

  // ---------- parts ----------
  const Header = () => {
    if (isModern) {
      return (
        <div
          className="flex items-center justify-between rounded-3xl px-8 py-8 shadow-md relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${brandColor}, #0f172a)`, color: "white" }}
        >
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 blur-3xl rounded-full pointer-events-none"></div>
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white/5 blur-3xl rounded-full pointer-events-none"></div>
          <div className="flex items-center gap-5 relative z-10">
            {seller.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={seller.logo_url}
                alt="logo"
                className="h-16 w-16 rounded-xl bg-white object-contain p-1.5 shadow-sm"
              />
            )}
            <div>
              <div className="text-[24px] font-extrabold leading-tight">
                {seller.name_ar}
              </div>
              {seller.name_en && (
                <div className="text-sm text-white/80 font-medium mt-1" dir="ltr">
                  {seller.name_en}
                </div>
              )}
            </div>
          </div>
          <div className="text-left relative z-10" dir="ltr">
            <div className="text-[10px] uppercase text-white/60 font-bold tracking-wider mb-1">Homais Co. LTD</div>
            <div className="text-sm font-semibold opacity-90">شركة هميس للنقل والخدمات اللوجستية </div>
            <div className="mt-2 font-mono text-xl font-bold bg-white/10 px-3 py-1 rounded inline-block">{invoice.number}</div>
          </div>
        </div>
      );
    }

    if (isMinimal) {
      return (
        <div className="flex items-start justify-between pb-4">
          <div>
            <h1 className="text-xl font-bold" style={{ color: "#111827" }}>
              {seller.name_ar}
            </h1>
            <p className="text-xs text-gray-500">
              فاتورة ضريبية إلكترونية · Electronic Tax Invoice
            </p>
          </div>
          <div className="text-left" dir="ltr">
            <div className="text-[10px] uppercase text-gray-500">Invoice #</div>
            <div className="font-mono text-base">{invoice.number}</div>
          </div>
        </div>
      );
    }

    // classic
    return (
      <div
        className="flex items-start justify-between pb-6"
        style={{ borderBottom: `1px solid ${ruleColor}` }}
      >
        <div className="flex items-center gap-4">
          {seller.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={seller.logo_url}
              alt="logo"
              className="h-16 w-16 rounded object-contain"
              style={{ border: `1px solid ${ruleColor}` }}
            />
          )}
          <div>
            <h1
              className="text-2xl font-bold leading-tight"
              style={{ color: brandColor }}
            >
              فاتورة ضريبية إلكترونية
            </h1>
            <p className="text-xs tracking-wide text-gray-500">
              Electronic Tax Invoice
            </p>
          </div>
        </div>
        <div className="text-left" dir="ltr">
          <div className="text-[10px] uppercase text-gray-500">Invoice #</div>
          <div className="font-mono text-lg">{invoice.number}</div>
          <div className="mt-2 text-[10px] uppercase text-gray-500">UUID</div>
          <div className="break-all font-mono text-[9px] text-gray-600">
            {invoice.uuid}
          </div>
        </div>
      </div>
    );
  };

  const Parties = () => (
    <div className="my-8 grid grid-cols-2 gap-6">
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 break-words">
        <h2 className="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center justify-between">
          <span>من (المورّد)</span>
          <span dir="ltr">From (Seller)</span>
        </h2>
        <p className="text-xl font-extrabold text-slate-800 leading-tight mb-1">{seller.name_ar}</p>
        {seller.name_en && (
          <p className="text-sm text-slate-500 font-medium mb-3" dir="ltr">
            {seller.name_en}
          </p>
        )}
        <div className="space-y-1.5 mt-4 pt-4 border-t border-slate-200/60">
          <p className="text-xs text-slate-600 font-medium flex justify-between">
            <span>الرقم الضريبي:</span>
            <span dir="ltr" className="font-mono text-slate-800">{seller.vat_number}</span>
          </p>
          {seller.address_ar && (
            <p className="text-xs text-slate-500 leading-relaxed mt-2">{seller.address_ar}</p>
          )}
        </div>
      </div>
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 break-words">
        <h2 className="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center justify-between">
          <span>إلى (العميل)</span>
          <span dir="ltr">To (Customer)</span>
        </h2>
        <p className="text-xl font-extrabold text-slate-800 leading-tight mb-1">{customer.name}</p>

        <div className="space-y-1.5 mt-5 pt-4 border-t border-slate-200/60">
          {customer.vat_number ? (
            <p className="text-xs text-slate-600 font-medium flex justify-between mb-2">
              <span>الرقم الضريبي:</span>
              <span dir="ltr" className="font-mono text-slate-800">{customer.vat_number}</span>
            </p>
          ) : (
            <p className="text-xs text-slate-400 italic mb-2">لا يوجد رقم ضريبي مضاف</p>
          )}
          <p className="text-xs text-slate-600 font-medium flex justify-between">
            <span>تاريخ الإصدار:</span>
            <span className="text-slate-800 font-mono" dir="ltr">
              {new Date(invoice.issue_date).toLocaleDateString("en-GB")}
            </span>
          </p>
          {invoice.due_date && (
            <p className="text-xs text-slate-600 font-medium flex justify-between">
              <span>تاريخ الاستحقاق:</span>
              <span className="text-slate-800 font-mono" dir="ltr">
                {new Date(invoice.due_date).toLocaleDateString("en-GB")}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const Items = () => (
    <div className="rounded-2xl border border-slate-100 overflow-hidden mt-6 shadow-sm">
      <table className="w-full text-right border-collapse bg-white">
        <thead>
          <tr
            className="text-[11px] font-bold uppercase tracking-wide"
            style={{
              color: isModern ? "white" : "#475569",
              background: isModern ? brandColor : "#f8fafc",
            }}
          >
            <th className="py-4 px-6">#</th>
            <th className="py-4 px-2">الوصف</th>
            <th className="py-4 px-2">الكمية</th>
            <th className="py-4 px-2">السعر</th>
            <th className="py-4 px-6 text-left">الإجمالي</th>
          </tr>
        </thead>
        <tbody className="text-sm divide-y divide-slate-100">
          {invoice.line_items.map((li, i) => {
            const line = li.qty * li.unit_price;
            return (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-5 px-6 font-medium text-slate-400">{i + 1}</td>
                <td className="py-5 px-2 font-bold text-slate-800">{li.description}</td>
                <td className="py-5 px-2 text-slate-600 font-mono">{li.qty}</td>
                <td className="py-5 px-2 text-slate-600 font-mono">{fmt(li.unit_price)}</td>
                <td className="py-5 px-6 font-bold text-slate-800 font-mono text-left">{fmt(line)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const Totals = () => (
    <div className="mt-8 flex justify-end">
      <div className="w-[50%] space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-6 shadow-sm">
        <div className="flex justify-between text-slate-600 font-medium text-sm">
          <span>المجموع قبل الضريبة</span>
          <span className="font-mono">{fmt(invoice.subtotal)} ر.س</span>
        </div>
        <div className="flex justify-between text-slate-600 font-medium text-sm">
          <span>ضريبة القيمة المضافة ١٥٪</span>
          <span className="font-mono">{fmt(invoice.vat_amount)} ر.س</span>
        </div>
        <div
          className="mt-2 flex justify-between pt-5 text-xl font-extrabold"
          style={{ borderTop: `2px dashed #cbd5e1`, color: brandColor }}
        >
          <span>الإجمالي</span>
          <span className="font-mono">{fmt(invoice.total)} ر.س</span>
        </div>
      </div>
    </div>
  );

  const Footer = () => (
    <div
      className="mt-auto flex items-end justify-between pt-4"
      style={{ borderTop: `1px solid ${ruleColor}` }}
    >
      <div className="max-w-[55%] text-[9px] leading-relaxed text-gray-500">
        {notes && (
          <p className="mb-2 whitespace-pre-wrap text-[10px] text-gray-700">
            {notes}
          </p>
        )}
        <p>
          تم توليد هذه الفاتورة عبر InvoiceGenie بما يتوافق مع متطلبات ZATCA
          المرحلة الأولى.
        </p>
      </div>
      {qrDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qrDataUrl}
          alt="ZATCA QR"
          style={{
            width: 110,
            height: 110,
            border: `1px solid ${ruleColor}`,
            borderRadius: 6,
          }}
        />
      )}
    </div>
  );

  return (
    <div style={pageStyle} className="invoice-page">
      <div
        ref={contentRef}
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          transform: mode === "page" ? `scale(${scale})` : undefined,
          transformOrigin: "top right",
        }}
      >
        <Header />
        <Parties />
        <Items />
        <Totals />
        <div style={{ flex: 1 }} />
        <Footer />
      </div>
    </div>
  );
}
