import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto max-w-4xl px-6 pt-24 pb-16 text-center">
        <h1 className="text-5xl font-bold text-brand leading-tight mb-6">
          فواتير ZATCA
          <br />
          من رسالة أو صوت
        </h1>
        <p className="text-xl text-gray-600 mb-10 leading-relaxed">
          اكتب أو قل: &ldquo;فاتورة لأحمد 500 ريال مقابل دهان&rdquo; — وسنجهز
          لك فاتورة ضريبية مبسطة متوافقة مع هيئة الزكاة والضريبة والجمارك
          خلال ثوانٍ.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-8 py-3 rounded-lg bg-brand text-white font-semibold hover:bg-brand-dark transition"
          >
            ابدأ مجاناً
          </Link>
          <Link
            href="#features"
            className="px-8 py-3 rounded-lg border border-gray-300 font-semibold hover:bg-gray-50 transition"
          >
            تعرّف أكثر
          </Link>
        </div>
        <p className="mt-6 text-sm text-gray-500">
          ٢٠ فاتورة مجاناً، ثم ١٥$ شهرياً
        </p>
      </section>

      <section
        id="features"
        className="mx-auto max-w-5xl px-6 py-16 grid md:grid-cols-3 gap-8"
      >
        <Feature
          title="إدخال ذكي بالعربية"
          body="اكتب أو تكلّم بلغتك الطبيعية — نستخرج اسم العميل، المبلغ، والوصف تلقائياً."
        />
        <Feature
          title="متوافق مع ZATCA"
          body="كل فاتورة تحتوي على رمز QR مبني بصيغة TLV حسب مواصفات هيئة الزكاة والضريبة."
        />
        <Feature
          title="جاهز للطباعة"
          body="احفظ الفاتورة PDF أو أرسلها مباشرة للعميل عبر واتساب."
        />
      </section>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="p-6 rounded-xl bg-white shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold mb-2 text-brand">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{body}</p>
    </div>
  );
}
