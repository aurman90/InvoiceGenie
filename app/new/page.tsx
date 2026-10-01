"use client";

import Link from "next/link";
import { InvoiceForm, EMPTY_INVOICE_FORM } from "@/components/InvoiceForm";

export default function NewInvoicePage() {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-50 mt-4 mx-4 md:mx-auto md:max-w-3xl rounded-2xl bg-white/80 backdrop-blur-md border border-slate-100 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-extrabold text-slate-800">
            Invoice<span className="text-brand">Genie</span>
          </Link>
          <Link href="/dashboard" className="text-sm font-semibold text-slate-500 hover:text-brand transition-colors">
            ← لوحة التحكم
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-bold mb-2">فاتورة جديدة</h1>
        <p className="text-gray-600 mb-8">
          اختر العميل وبنود الفاتورة. تُحسب ضريبة القيمة المضافة (١٥٪)
          تلقائياً.
        </p>

        <InvoiceForm mode="create" initial={EMPTY_INVOICE_FORM} />
      </div>
    </main>
  );
}
