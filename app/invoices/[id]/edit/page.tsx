import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { LineItem } from "@/lib/zatca/validate";
import {
  InvoiceForm,
  type InvoiceFormLineItem,
} from "@/components/InvoiceForm";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditInvoicePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, customer_id, line_items, due_date, notes_override, hide_notes",
    )
    .eq("id", id)
    .maybeSingle();
  if (!invoice) notFound();

  const items = invoice.line_items as LineItem[];
  const initialItems: InvoiceFormLineItem[] = items.map((li) => ({
    description: li.description,
    qty: Number(li.qty),
    unit_price: Number(li.unit_price),
    vat_rate: Number(li.vat_rate ?? 0.15),
  }));

  // due_date is stored as YYYY-MM-DD — strip the day for the <input type="month">.
  const dueMonth = invoice.due_date
    ? String(invoice.due_date).slice(0, 7)
    : "";

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-50 mt-4 mx-4 md:mx-auto md:max-w-3xl rounded-2xl bg-white/80 backdrop-blur-md border border-slate-100 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-extrabold text-slate-800">
            Invoice<span className="text-brand">Genie</span>
          </Link>
          <Link href={`/invoices/${id}`} className="text-sm font-semibold text-slate-500 hover:text-brand transition-colors">
            ← رجوع للطباعة
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-bold mb-2">
          تعديل الفاتورة {invoice.invoice_number}
        </h1>
        <p className="text-gray-600 mb-8">
          سيتم إعادة حساب الإجماليات ورمز ZATCA QR تلقائياً بعد الحفظ.
        </p>

        <InvoiceForm
          mode="edit"
          invoiceId={id}
          initial={{
            customer_id: invoice.customer_id ?? "",
            line_items: initialItems,
            due_month: dueMonth,
            notes_mode: invoice.hide_notes
              ? "hidden"
              : invoice.notes_override !== null &&
                  invoice.notes_override !== undefined
                ? "custom"
                : "default",
            notes_text: invoice.notes_override ?? "",
          }}
        />
      </div>
    </main>
  );
}
