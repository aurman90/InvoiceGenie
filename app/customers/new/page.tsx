"use client";

import Link from "next/link";
import { CustomerForm, EMPTY_CUSTOMER } from "../CustomerForm";

export default function NewCustomerPage() {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-50 mt-4 mx-4 md:mx-auto md:max-w-xl rounded-2xl bg-white/80 backdrop-blur-md border border-slate-100 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-extrabold text-slate-800">
            Invoice<span className="text-brand">Genie</span>
          </Link>
          <Link href="/customers" className="text-sm font-semibold text-slate-500 hover:text-brand transition-colors">
            ← العملاء
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-bold mb-2">عميل جديد</h1>
        <p className="text-gray-600 mb-8">
          الاسم فقط مطلوب — باقي الحقول اختيارية.
        </p>
        <CustomerForm initial={EMPTY_CUSTOMER} submitLabel="إضافة العميل" />
      </div>
    </main>
  );
}
