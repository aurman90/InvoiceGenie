import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsage } from "@/lib/usage";

export const dynamic = "force-dynamic";

function fmt(n: number) {
  return n.toLocaleString("ar-SA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Business setup banner check.
  const { data: business } = await supabase
    .from("businesses")
    .select("name_ar, vat_number")
    .eq("owner_id", user.id)
    .maybeSingle();

  // All invoices for stats, and the latest 10 for the table.
  const { data: allInvoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, customer_name, total, vat_amount, issue_date, created_at, doc_type, status")
    .order("created_at", { ascending: false });

  const { count: customersCount } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true });

  const usage = await getUsage(user.id);

  const invoices = allInvoices ?? [];
  const recent = invoices.slice(0, 10);
  const totalRevenue = invoices.reduce(
    (s, inv) => s + Number(inv.total || 0),
    0,
  );
  const totalVat = invoices.reduce(
    (s, inv) => s + Number(inv.vat_amount || 0),
    0,
  );

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-50 mt-4 mx-4 md:mx-auto md:max-w-5xl rounded-2xl bg-white/80 backdrop-blur-md border border-slate-100 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-extrabold text-slate-800">
            Invoice<span className="text-brand">Genie</span>
          </Link>
          <nav className="flex gap-6 text-sm">
            <Link href="/dashboard" className="text-brand font-bold">
              لوحة التحكم
            </Link>
            <Link href="/customers" className="text-slate-500 font-semibold hover:text-brand transition-colors">
              العملاء
            </Link>
            <Link href="/settings" className="text-slate-500 font-semibold hover:text-brand transition-colors">
              المنشأة
            </Link>
            <Link href="/templates" className="text-slate-500 font-semibold hover:text-brand transition-colors">
              استوديو الفواتير
            </Link>
            <Link href="/settings/routes" className="text-slate-500 font-semibold hover:text-brand transition-colors flex items-center gap-1 group">
              <span className="text-[10px] bg-brand text-white px-1.5 py-0.5 rounded-full font-bold group-hover:scale-110 transition-transform">جديد</span>
              المسارات
            </Link>
            <form action="/api/auth/signout" method="post">
              <button type="submit" className="text-slate-500 font-semibold hover:text-red-500 transition-colors">
                خروج
              </button>
            </form>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        {!business && (
          <div className="mb-6 p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-900">
            لم تقم بإعداد بيانات المنشأة بعد.{" "}
            <Link href="/settings" className="underline font-semibold">
              أكمل الإعداد الآن
            </Link>
            .
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">لوحة التحكم</h1>
            <p className="text-gray-600 mt-1">
              استخدمت {usage.used} من {usage.limit} فاتورة مجانية.
            </p>
          </div>
          <Link
            href="/new"
            aria-disabled={!business}
            className={`px-6 py-3 rounded-xl font-bold shadow-sm transition-all duration-300 ${
              business
                ? "bg-brand text-white hover:bg-brand-dark hover:shadow-brand/20 hover:-translate-y-0.5"
                : "bg-slate-200 text-slate-400 pointer-events-none"
            }`}
          >
            + إنشاء فاتورة
          </Link>
        </div>

        {usage.overLimit && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-900">
            انتهت باقتك المجانية (٢٠ فاتورة). يرجى الاشتراك للمتابعة.
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard
            label="إجمالي الفواتير"
            value={String(invoices.length)}
            suffix="فاتورة"
          />
          <StatCard
            label="إجمالي الإيرادات"
            value={fmt(totalRevenue)}
            suffix="ر.س"
          />
          <StatCard
            label="ضريبة القيمة المضافة"
            value={fmt(totalVat)}
            suffix="ر.س"
          />
          <StatCard
            label="عدد العملاء"
            value={String(customersCount ?? 0)}
            suffix="عميل"
          />
        </div>

        {/* Recent invoices */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">المستندات الأخيرة (فواتير وعروض أسعار)</h2>
          {invoices.length > 10 && (
            <span className="text-sm text-gray-500">
              عرض ١٠ من {invoices.length}
            </span>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-500">
              لم تصدر أي فاتورة بعد. ابدأ بفاتورتك الأولى الآن.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-right">
              <thead className="bg-slate-50 text-sm text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-4 font-semibold">الرقم</th>
                  <th className="px-5 py-4 font-semibold">العميل</th>
                  <th className="px-5 py-4 font-semibold">المجموع</th>
                  <th className="px-5 py-4 font-semibold">التاريخ</th>
                  <th className="px-5 py-4 font-semibold text-center">التفاصيل</th>
                  <th className="px-5 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recent.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 font-mono font-medium text-slate-700">
                      {inv.invoice_number}
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-800">{inv.customer_name}</td>
                    <td className="px-5 py-4 font-bold text-brand">
                      {fmt(Number(inv.total))} ر.س
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-sm">
                      {new Date(inv.issue_date).toLocaleDateString("ar-SA")}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex gap-2 items-center justify-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                          (!inv.doc_type || inv.doc_type === 'invoice') ? 'bg-indigo-50 text-indigo-600' : 'bg-purple-50 text-purple-600'
                        }`}>
                          {(!inv.doc_type || inv.doc_type === 'invoice') ? 'فاتورة' : 'عرض سعر'}
                        </span>
                        {(!inv.doc_type || inv.doc_type === 'invoice') && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                            inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : inv.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {inv.status === 'paid' ? 'مدفوعة' : inv.status === 'cancelled' ? 'ملغاة' : 'غير مدفوعة'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="inline-block px-4 py-2 rounded-lg bg-emerald-50 text-brand font-semibold hover:bg-emerald-100 transition-colors"
                      >
                        عرض
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix: string;
}) {
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
      <div className="absolute -right-4 -top-4 w-16 h-16 bg-brand/5 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
      <div className="text-sm font-semibold text-slate-500 mb-3">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-extrabold text-slate-800">{value}</span>
        <span className="text-xs font-semibold text-slate-400">{suffix}</span>
      </div>
    </div>
  );
}
