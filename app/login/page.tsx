"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Step = "email" | "code";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrorMsg("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        // Pin the redirect to THIS origin + /auth/callback so the magic-link
        // fallback in the email (if the user clicks the link instead of
        // entering the code) lands on a route that actually exists.
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });
    setBusy(false);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrorMsg("");
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    setBusy(false);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function resend() {
    setBusy(true);
    setErrorMsg("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });
    setBusy(false);
    if (error) setErrorMsg(error.message);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-slate-100 p-8 sm:p-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
            تسجيل الدخول
          </h1>
          <p className="text-slate-500">
            {step === "email"
              ? "أدخل بريدك الإلكتروني لاصدار وفواتيرك بكل سهولة."
              : "تحقق من بريدك لرمز الدخول المجاني."}
          </p>
        </div>

        {step === "email" ? (
          <form onSubmit={sendCode} className="space-y-5">
            <div>
              <input
                type="email"
                required
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                className="w-full px-5 py-4 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all outline-none text-left"
                dir="ltr"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full py-4 rounded-xl bg-brand text-white font-bold text-lg hover:bg-brand-dark hover:shadow-lg hover:shadow-brand/30 hover:-translate-y-0.5 disabled:transform-none disabled:shadow-none disabled:opacity-50 transition-all duration-300"
            >
              {busy ? "جارٍ الإرسال..." : "أرسل الرمز"}
            </button>
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center">
                {errorMsg}
              </div>
            )}
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-5">
            <p className="text-slate-600 mb-6 text-center text-sm leading-relaxed">
              أرسلنا رمزاً مكوّناً من ٦ أرقام إلى{" "}
              <strong dir="ltr" className="text-slate-900 mx-1">{email}</strong><br/>أدخله هنا للمتابعة.
            </p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              required
              placeholder="••••••"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              disabled={busy}
              maxLength={6}
              className="w-full px-4 py-4 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all outline-none text-center text-3xl tracking-[0.5em] font-mono"
              dir="ltr"
            />
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="w-full py-4 rounded-xl bg-brand text-white font-bold text-lg hover:bg-brand-dark hover:shadow-lg hover:shadow-brand/30 hover:-translate-y-0.5 disabled:transform-none disabled:shadow-none disabled:opacity-50 transition-all duration-300"
            >
              {busy ? "جارٍ التحقق..." : "تحقّق وادخل"}
            </button>
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center">
                {errorMsg}
              </div>
            )}
            <div className="flex justify-between items-center text-sm pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setErrorMsg("");
                }}
                className="text-slate-500 hover:text-slate-800 transition-colors"
              >
                ← تغيير البريد
              </button>
              <button
                type="button"
                onClick={resend}
                disabled={busy}
                className="text-brand font-semibold hover:underline disabled:opacity-50"
              >
                إعادة إرسال الرمز
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
