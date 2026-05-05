import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand/5 blur-[120px] rounded-full pointer-events-none" />

      <section className="relative z-10 mx-auto max-w-4xl px-6 pt-32 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/10 text-brand text-sm font-semibold mb-8 border border-brand/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
          </span>
          متوافق مع المرحلة الأولى (ZATCA)
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 leading-[1.1] mb-6 tracking-tight">
          فواتير ضريبية
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-emerald-400">
            بكل سهولة وجمال
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl text-slate-600 mb-10 leading-relaxed max-w-2xl mx-auto font-light">
          أصدر فواتير ضريبية مبسطة متوافقة مع هيئة الزكاة والضريبة والجمارك
          خلال ثوانٍ — مع تصميم احترافي ورمز QR جاهز للطباعة.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-brand text-white font-bold text-lg hover:bg-brand-dark hover:shadow-lg hover:shadow-brand/30 hover:-translate-y-0.5 transition-all duration-300"
          >
            ابدأ مجاناً
          </Link>
          <Link
            href="/demo"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-lg hover:bg-slate-50 hover:shadow-sm hover:border-slate-300 transition-all duration-300 backdrop-blur-sm"
          >
            جرّب بدون تسجيل
          </Link>
        </div>
        <p className="mt-6 text-sm text-slate-500 font-medium opacity-80">
          ٢٠ فاتورة مجاناً، ثم ١٥$ شهرياً
        </p>
      </section>

      <section
        id="features"
        className="relative z-10 mx-auto max-w-5xl px-6 py-16 grid md:grid-cols-3 gap-8"
      >
        <Feature
          icon="⚡"
          title="إدخال سريع"
          body="نموذج عربي بسيط وذكي: اسم العميل، البنود، الأسعار — وتُحسب ضريبة القيمة المضافة بشكل تلقائي ودقيق."
        />
        <Feature
          icon="🛡️"
          title="متوافق 100%"
          body="كل فاتورة تتضمن رمز QR مبني بصيغة TLV الصارمة حسب مواصفات هيئة الزكاة والضريبة والجمارك."
        />
        <Feature
          icon="🖨️"
          title="طباعة فاخرة"
          body="تصميم A4 أنيق جداً بالعربية مع هيكلية ممتازة للبيانات — احفظ الفاتورة كـ PDF بلمسة واحدة."
        />
      </section>
    </main>
  );
}

function Feature({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="p-8 rounded-2xl bg-white/70 backdrop-blur-lg shadow-sm border border-slate-100 hover:shadow-md hover:border-brand/20 transition-all duration-300 group">
      <div className="text-3xl mb-4 p-3 bg-slate-50 rounded-xl inline-block group-hover:scale-110 group-hover:bg-brand/5 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-slate-800 group-hover:text-brand transition-colors duration-300">{title}</h3>
      <p className="text-slate-600 leading-relaxed font-medium">{body}</p>
    </div>
  );
}
