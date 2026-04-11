import { notFound } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import type { LineItem } from "@/lib/zatca/validate";
import PrintButton from "./print-button";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!invoice) notFound();

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", invoice.business_id)
    .maybeSingle();
  if (!business) notFound();

  const qrDataUrl = await QRCode.toDataURL(invoice.qr_base64, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
  });

  const items = invoice.line_items as LineItem[];

  return (
    <main className="min-h-screen">
      <header className="no-print border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold text-brand">
            InvoiceGenie
          </Link>
          <div className="flex gap-3 items-center">
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm hover:text-brand"
            >
              ← رجوع
            </Link>
            <PrintButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <article className="print-page bg-white shadow-sm border border-gray-200 rounded-xl p-10">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-gray-200 pb-6">
            <div>
              <h1 className="text-2xl font-bold text-brand">
                فاتورة ضريبية مبسطة
              </h1>
              <p className="text-sm text-gray-500 tracking-wide">
                Simplified Tax Invoice
              </p>
            </div>
            <div className="text-left" dir="ltr">
              <p className="text-xs text-gray-500">Invoice #</p>
              <p className="font-mono text-lg">{invoice.invoice_number}</p>
              <p className="text-xs text-gray-500 mt-2">UUID</p>
              <p className="font-mono text-xs text-gray-600 break-all">
                {invoice.uuid}
              </p>
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-8 my-6">
            <div>
              <h2 className="text-xs uppercase text-gray-500 mb-2">البائع</h2>
              <p className="font-bold text-lg">{business.name_ar}</p>
              {business.name_en && (
                <p className="text-sm text-gray-500" dir="ltr">
                  {business.name_en}
                </p>
              )}
              <p className="text-sm text-gray-700 mt-1">
                الرقم الضريبي: <span dir="ltr">{business.vat_number}</span>
              </p>
              {business.address_ar && (
                <p className="text-sm text-gray-700">{business.address_ar}</p>
              )}
            </div>
            <div>
              <h2 className="text-xs uppercase text-gray-500 mb-2">العميل</h2>
              <p className="font-bold text-lg">{invoice.customer_name}</p>
              {invoice.customer_vat && (
                <p className="text-sm text-gray-700 mt-1">
                  الرقم الضريبي:{" "}
                  <span dir="ltr">{invoice.customer_vat}</span>
                </p>
              )}
              <p className="text-xs text-gray-500 mt-3">
                تاريخ الإصدار:{" "}
                {new Date(invoice.issue_date).toLocaleString("ar-SA")}
              </p>
            </div>
          </div>

          {/* Line items */}
          <table className="w-full text-right border-t border-gray-200">
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className="py-3 font-semibold">#</th>
                <th className="py-3 font-semibold">الوصف</th>
                <th className="py-3 font-semibold">الكمية</th>
                <th className="py-3 font-semibold">السعر</th>
                <th className="py-3 font-semibold">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {items.map((li, i) => {
                const line = li.qty * li.unit_price;
                return (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="py-3">{i + 1}</td>
                    <td className="py-3">{li.description}</td>
                    <td className="py-3">{li.qty}</td>
                    <td className="py-3">{li.unit_price.toFixed(2)} ر.س</td>
                    <td className="py-3">{line.toFixed(2)} ر.س</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mt-6">
            <div className="w-72 space-y-2 text-sm">
              <Row
                label="المجموع قبل الضريبة"
                value={`${Number(invoice.subtotal).toFixed(2)} ر.س`}
              />
              <Row
                label="ضريبة القيمة المضافة ١٥٪"
                value={`${Number(invoice.vat_amount).toFixed(2)} ر.س`}
              />
              <div className="border-t border-gray-200 pt-2">
                <Row
                  label="الإجمالي مع الضريبة"
                  value={`${Number(invoice.total).toFixed(2)} ر.س`}
                  bold
                />
              </div>
            </div>
          </div>

          {/* QR */}
          <div className="flex items-end justify-between mt-10 pt-6 border-t border-gray-200">
            <div className="text-xs text-gray-500 leading-relaxed max-w-md">
              <p>
                تم توليد هذه الفاتورة عبر InvoiceGenie بما يتوافق مع متطلبات
                ZATCA المرحلة الأولى.
              </p>
              <p className="mt-1">
                QR Payload (TLV base64):
                <br />
                <span className="font-mono break-all text-[10px]" dir="ltr">
                  {invoice.qr_base64}
                </span>
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt="ZATCA QR"
              width={140}
              height={140}
              className="border border-gray-200 rounded"
            />
          </div>
        </article>
      </div>
    </main>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${bold ? "font-bold text-lg" : "text-gray-700"}`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
