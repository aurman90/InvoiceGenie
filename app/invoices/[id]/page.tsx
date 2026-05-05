import { notFound } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import type { LineItem } from "@/lib/zatca/validate";
import PrintButton from "./print-button";
import {
  InvoiceLayout,
  type InvoiceTemplate,
} from "@/components/InvoiceLayout";
import { DocumentActions } from "./DocumentActions";

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

  // Fetch the customer for address/email — falls back to denormalized
  // name/VAT on the invoice if the customer was deleted later.
  const { data: customer } = invoice.customer_id
    ? await supabase
        .from("customers")
        .select("address, email")
        .eq("id", invoice.customer_id)
        .maybeSingle()
    : { data: null };

  const qrDataUrl = await QRCode.toDataURL(invoice.qr_base64, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
  });

  const items = invoice.line_items as LineItem[];
  const template = (business.invoice_template ?? "classic") as InvoiceTemplate;
  const brandColor = business.brand_color ?? "#0f766e";
  const notes = invoice.hide_notes
    ? null
    : invoice.notes_override !== null && invoice.notes_override !== undefined
      ? invoice.notes_override
      : (business.invoice_notes ?? null);
  const stampUrl = business.stamp_url ?? null;
  
  // Merge business defaults with invoice-specific overrides
  const invoiceSettings = {
    ...(business.invoice_settings || {}),
    ...(invoice.override_settings || {})
  };

  return (
    <main className="min-h-screen">
      <header className="no-print sticky top-0 z-50 mt-4 mx-4 md:mx-auto md:max-w-5xl rounded-2xl bg-white/80 backdrop-blur-md border border-slate-100 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-extrabold text-slate-800">
            Invoice<span className="text-brand">Genie</span>
          </Link>
          <div className="flex gap-3 items-center">
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm text-slate-500 font-semibold hover:text-brand transition-colors"
            >
              ← رجوع
            </Link>
            <Link
              href={`/invoices/${id}/edit`}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              ✎ تعديل
            </Link>
            <PrintButton />
          </div>
        </div>
      </header>

      <div className="mx-auto py-10 flex flex-col items-center justify-center no-print">
        <div className="w-full max-w-[210mm]">
          <DocumentActions 
            invoice={invoice as any} 
            businessName={business.name_ar} 
          />
        </div>
        <div
          className="shadow-sm border border-slate-100 rounded-lg bg-white"
          style={{ width: "210mm", minHeight: "297mm" }}
        >
          <InvoiceLayout
            mode="page"
            template={template}
            brandColor={brandColor}
            notes={notes}
            seller={{
              name_ar: business.name_ar,
              name_en: business.name_en,
              vat_number: business.vat_number,
              address_ar: business.address_ar,
              logo_url: business.logo_url,
            }}
            customer={{
              name: invoice.customer_name,
              vat_number: invoice.customer_vat,
              address: customer?.address ?? null,
              email: customer?.email ?? null,
            }}
            invoice={{
              doc_type: invoice.doc_type,
              status: invoice.status,
              number: invoice.invoice_number,
              uuid: invoice.uuid,
              issue_date: invoice.issue_date,
              due_date: invoice.due_date,
              subtotal: Number(invoice.subtotal),
              vat_amount: Number(invoice.vat_amount),
              total: Number(invoice.total),
              line_items: items,
            }}
            qrDataUrl={qrDataUrl}
            invoiceSettings={invoiceSettings}
            stampUrl={stampUrl}
          />
        </div>
      </div>

      {/* Print-only copy — no border/shadow, exact A4 */}
      <div className="only-print">
        <InvoiceLayout
          mode="page"
          template={template}
          brandColor={brandColor}
          notes={notes}
          seller={{
            name_ar: business.name_ar,
            name_en: business.name_en,
            vat_number: business.vat_number,
            address_ar: business.address_ar,
            logo_url: business.logo_url,
          }}
          customer={{
            name: invoice.customer_name,
            vat_number: invoice.customer_vat,
          }}
          invoice={{
            doc_type: invoice.doc_type,
            status: invoice.status,
            number: invoice.invoice_number,
            uuid: invoice.uuid,
            issue_date: invoice.issue_date,
            due_date: invoice.due_date,
            subtotal: Number(invoice.subtotal),
            vat_amount: Number(invoice.vat_amount),
            total: Number(invoice.total),
            line_items: items,
          }}
          qrDataUrl={qrDataUrl}
          invoiceSettings={invoiceSettings}
          stampUrl={stampUrl}
        />
      </div>
    </main>
  );
}
