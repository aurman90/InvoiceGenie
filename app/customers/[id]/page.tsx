import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CustomerForm } from "../CustomerForm";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, address, commercial_register, vat_number, email")
    .eq("id", id)
    .maybeSingle();

  if (!customer) notFound();

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
            <form action="/api/auth/signout" method="post">
              <button type="submit" className="text-slate-500 font-semibold hover:text-red-500 transition-colors">
                خروج
              </button>
            </form>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-bold mb-8">تعديل العميل</h1>
        <CustomerForm
          customerId={customer.id}
          initial={{
            name: customer.name ?? "",
            address: customer.address ?? "",
            commercial_register: customer.commercial_register ?? "",
            vat_number: customer.vat_number ?? "",
            email: customer.email ?? "",
          }}
          submitLabel="حفظ التعديلات"
          showDelete
        />
      </div>
    </main>
  );
}
