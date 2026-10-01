"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface InvoiceDoc {
  id: string;
  doc_type: string;
  status: string;
  invoice_number: string;
  total: number;
}

interface Props {
  invoice: InvoiceDoc;
  businessName: string;
}

export function DocumentActions({ invoice, businessName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(invoice.status || "unpaid");

  const isQuotation = invoice.doc_type === "quotation";
  
  // Build WhatsApp Link
  const docName = isQuotation ? "عرض سعر" : "فاتورة ضريبية";
  const msg = `مرحباً،
تم إصدار ${docName} من (${businessName}) بقيمة ${invoice.total} ر.س.
رقم المستند: ${invoice.invoice_number}

يمكنكم الاطلاع عليها عبر الرابط التالي:
https://invoicegenie-theta.vercel.app/invoices/${invoice.id}
`;
  const waLink = `https://wa.me/?text=${encodeURIComponent(msg)}`;

  async function handleConvert() {
    if (!confirm("هل أنت متأكد من تحويل عرض السعر إلى فاتورة ضريبية؟ سيتم توليد رقم تسلسلي جديد للفاتورة.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/convert`, { method: "POST" });
      if (!res.ok) throw new Error("فشل التحويل");
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    setStatus(newStatus);
    try {
      await fetch(`/api/invoices/${invoice.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } catch (e) {
      alert("فشل تحديث الحالة");
      setStatus(invoice.status);
    }
  }

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 p-6 shadow-sm mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between no-print">
      <div className="flex items-center gap-4 w-full sm:w-auto">
        {/* WhatsApp Button */}
        <a 
          href={waLink} 
          target="_blank" 
          rel="noreferrer"
          className="flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-xl font-bold hover:bg-[#1ebd5a] transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.666.598 1.216.774 1.388.86.173.086.275.072.376-.043.101-.115.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-3.825 3.113-6.937 6.937-6.937 1.856.001 3.598.723 4.907 2.034 1.31 1.311 2.031 3.054 2.03 4.908-.001 3.825-3.113 6.938-6.937 6.938z"/></svg>
          إرسال للعميل
        </a>

        {/* Change Status */}
        {!isQuotation && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">حالة الدفع:</span>
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`px-3 py-2 outline-none rounded-lg text-sm font-bold border transition-colors ${
                status === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                : status === "cancelled" ? "bg-red-50 text-red-700 border-red-200" 
                : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              <option value="unpaid">غير مدفوعة</option>
              <option value="paid">مدفوعة</option>
              <option value="cancelled">ملغاة</option>
            </select>
          </div>
        )}
      </div>

      {/* Convert to Invoice */}
      {isQuotation && (
        <button
          onClick={handleConvert}
          disabled={loading}
          className="bg-brand text-white font-bold py-2 px-6 rounded-xl text-sm hover:hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50"
        >
          {loading ? "جارٍ التحويل..." : "التحويل لفاتورة ضريبية"}
        </button>
      )}
    </div>
  );
}
