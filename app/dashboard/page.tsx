import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsage } from "@/lib/usage";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // middleware will redirect

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, customer_name, total, issue_date, source")
    .order("created_at", { ascending: false });

  const { data: business } = await supabase
    .from("businesses")
    .select("name_ar, vat_number")
    .eq("owner_id", user.id)
    .maybeSingle();

  const usage = await getUsage(user.id);

  return (
    <main className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold text-brand">
            InvoiceGenie
          </Link>
          <nav className="flex gap-6 text-sm">
            <Link href="/dashboard" className="hover:text-brand">
              لوحة التحكم
            </Link>
            <Link href="/settings" className="hover:text-brand">
              المنشأة
            </Link>
            <form action="/api/auth/signout" method="post">
              <button type="submit" className="hover:text-red-600">
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
            <h1 className="text-3xl font-bold">فواتيري</h1>
            <p className="text-gray-600 mt-1">
              استخدمت {usage.used} من {usage.limit} فاتورة مجانية.
            </p>
          </div>
          <Link
            href="/new"
            aria-disabled={!business}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              business
                ? "bg-brand text-white hover:bg-brand-dark"
                : "bg-gray-200 text-gray-400 pointer-events-none"
            }`}
          >
            + فاتورة جديدة
          </Link>
        </div>

        {usage.overLimit && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-900">
            انتهت باقتك المجانية (٢٠ فاتورة). يرجى الاشتراك للمتابعة.
          </div>
        )}

        {!invoices || invoices.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-500">
              لم تصدر أي فاتورة بعد. ابدأ بفاتورتك الأولى الآن.
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
            <table className="w-full text-right">
              <thead className="bg-gray-50 text-sm text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">الرقم</th>
                  <th className="px-4 py-3 font-semibold">العميل</th>
                  <th className="px-4 py-3 font-semibold">المجموع</th>
                  <th className="px-4 py-3 font-semibold">التاريخ</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-mono">
                      {inv.invoice_number}
                    </td>
                    <td className="px-4 py-3">{inv.customer_name}</td>
                    <td className="px-4 py-3">
                      {Number(inv.total).toFixed(2)} ر.س
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(inv.issue_date).toLocaleDateString("ar-SA")}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="text-brand hover:underline"
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
