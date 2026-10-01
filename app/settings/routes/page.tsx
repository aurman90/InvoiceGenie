"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";

interface RouteItem {
  id: string;
  origin: string;
  destination: string;
  price: number;
}

export default function RoutesSettingsPage() {
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Single Route form
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [price, setPrice] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Bulk CSV
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    fetchRoutes();
  }, []);

  async function fetchRoutes() {
    setLoading(true);
    try {
      const res = await fetch("/api/routes");
      if (res.ok) {
        const { routes } = await res.json();
        setRoutes(routes || []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function addRoute(e: React.FormEvent) {
    e.preventDefault();
    setIsAdding(true);
    try {
      const p = parseFloat(price);
      if (isNaN(p) || p < 0) return alert("السعر غير صحيح");
      
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, destination, price: p }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setOrigin("");
      setDestination("");
      setPrice("");
      fetchRoutes();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setIsAdding(false);
    }
  }

  function downloadTemplate() {
    const ws_data = [
      ["نقطة الانطلاق", "الوجهة", "السعر"],
      ["الرياض", "الدمام", 1500],
      ["جدة", "مكة المكرمة", 500]
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المسارات");
    XLSX.writeFile(wb, "نموذج_مسارات_الفواتير.xlsx");
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
      
      const parsed = rows.slice(1).map(row => {
        if (!row || row.length < 3) return null;
        const origin = String(row[0]).trim();
        const destination = String(row[1]).trim();
        const price = parseFloat(String(row[2]));
        if (!origin || !destination || isNaN(price)) return null;
        return { origin, destination, price };
      }).filter(r => r !== null);

      if (parsed.length === 0) {
        throw new Error("لم يتم العثور على أسطر صالحة. تأكد من تطابق الملف مع النموذج.");
      }

      const res = await fetch("/api/routes/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      
      const apiData = await res.json();
      if (!res.ok) throw new Error(apiData.error);
      
      alert(`تم إضافة ${apiData.insertedCount} مسار بنجاح!`);
      fetchRoutes();
    } catch(err) {
      alert((err as Error).message);
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  }

  async function deleteRoute(id: string) {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    try {
      await fetch(`/api/routes/${id}`, { method: "DELETE" });
      setRoutes(r => r.filter(x => x.id !== id));
    } catch (e) {
      alert("فشل الحذف");
    }
  }

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100 flex items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="text-xl font-extrabold text-slate-800">
          Invoice<span className="text-brand">Genie</span>
        </Link>
        <Link href="/settings" className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 rounded-xl transition-colors font-bold">
          العودة للإعدادات
        </Link>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-slate-800">أسعار المسارات</h1>
          <p className="text-slate-500">قم بإضافة مسارات التوصيل وأسعارها ليتم استدعاؤها بضغطة زر داخل الفاتورة.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Add Route */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <h2 className="font-bold text-lg mb-4">إضافة فردية</h2>
            <form onSubmit={addRoute} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">من (نقطة الانطلاق)</label>
                <input required value={origin} onChange={e=>setOrigin(e.target.value)} placeholder="مثال: الرياض" className="w-full px-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-brand rounded-xl border text-sm transition-colors outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">إلى (الوجهة)</label>
                <input required value={destination} onChange={e=>setDestination(e.target.value)} placeholder="مثال: الدمام" className="w-full px-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-brand rounded-xl border text-sm transition-colors outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">السعر (ر.س)</label>
                <input required type="number" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} placeholder="1500" className="w-full px-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-brand rounded-xl border text-sm transition-colors outline-none" />
              </div>
              <button disabled={isAdding} className="w-full py-3 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-900 transition-colors disabled:opacity-50 text-sm">
                {isAdding ? "جارٍ الإضافة..." : "+ أضف المسار"}
              </button>
            </form>
          </div>

          {/* Bulk Import */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="font-bold text-lg mb-1">استيراد جماعي عبر إكسيل (Excel)</h2>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                وفر وقتك وقم برفع جميع المسارات دفعة واحدة عبر ملف إكسيل. يمكنك تنزيل النموذج المعتمد وتعبئته ثم رفعه هنا مجدداً.
              </p>
              
              <button 
                onClick={downloadTemplate}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 transition-colors text-sm mb-4"
              >
                📥 تنزيل نموذج الإكسيل (.xlsx)
              </button>
            </div>
            
            <div className="relative">
              <input 
                type="file" 
                accept=".xlsx,.xls,.csv" 
                onChange={handleFileUpload} 
                disabled={isImporting}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                title="اضغط لرفع الملف"
              />
              <div className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-brand text-white font-bold hover:bg-brand/90 transition-colors text-sm shadow-brand/20 shadow-lg border-2 border-dashed border-white/20">
                {isImporting ? "جارٍ تحليل الملف ورفعه..." : "🚀 استيراد الملف الآن"}
              </div>
            </div>
          </div>
        </div>

        {/* Existing Routes */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-lg">المسارات المحفوظة</h2>
            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">{routes.length} مسار</span>
          </div>
          {loading ? (
             <div className="p-8 text-center text-slate-400 font-bold">جارٍ التحميل...</div>
          ) : routes.length === 0 ? (
             <div className="p-12 text-center text-slate-400">لا يوجد مسارات مضافة بعد.</div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 font-bold text-slate-500">الانطلاق</th>
                    <th className="px-6 py-3 font-bold text-slate-500">الوجهة</th>
                    <th className="px-6 py-3 font-bold text-slate-500">السعر</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {routes.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3 font-semibold text-slate-700">{r.origin}</td>
                      <td className="px-6 py-3 font-semibold text-slate-700">{r.destination}</td>
                      <td className="px-6 py-3 font-bold text-brand">{r.price} ر.س</td>
                      <td className="px-6 py-3 text-left">
                        <button onClick={() => deleteRoute(r.id)} className="text-red-500 hover:text-red-600 font-bold text-xs bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md transition-colors">
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
