import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CustomerRow } from "./CustomerRow";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // proxy will redirect

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, vat_number, email, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-50 mt-4 mx-4 md:mx-auto md:max-w-5xl rounded-2xl bg-white/80 backdrop-blur-md border border-slate-100 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-extrabold text-slate-800">
            Invoice<span className="text-brand">Genie</span>
          </Link>
          <nav className="flex gap-6 text-sm">
            <Link href="/dashboard" className="text-slate-500 font-semibold hover:text-brand transition-colors">
              لوحة التحكم
            </Link>
            <Link href="/customers" className="text-brand font-bold">
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">العملاء</h1>
            <p className="text-gray-600 mt-1">
              {customers?.length ?? 0} عميل
            </p>
          </div>
          <Link
            href="/customers/new"
            className="px-6 py-3 rounded-xl bg-brand text-white font-bold hover:bg-brand-dark hover:shadow-lg hover:shadow-brand/20 hover:-translate-y-0.5 transition-all duration-300"
          >
            + عميل جديد
          </Link>
        </div>

        {!customers || customers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-500">
              لا يوجد عملاء بعد. ابدأ بإضافة عميلك الأول.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-right">
              <thead className="bg-slate-50 text-sm text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-4 font-semibold">الاسم</th>
                  <th className="px-5 py-4 font-semibold">الرقم الضريبي</th>
                  <th className="px-5 py-4 font-semibold">الإيميل</th>
                  <th className="px-5 py-4 font-semibold">تاريخ الإضافة</th>
                  <th className="px-5 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {customers.map((c) => (
                  <CustomerRow
                    key={c.id}
                    id={c.id}
                    name={c.name}
                    vatNumber={c.vat_number}
                    email={c.email}
                    createdAt={c.created_at}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
