"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-brand mb-2">
          تسجيل الدخول
        </h1>
        <p className="text-gray-600 mb-6">
          أدخل بريدك الإلكتروني وسنرسل لك رابط دخول آمن.
        </p>

        {status === "sent" ? (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4">
            تم إرسال الرابط إلى <strong>{email}</strong>. افتح بريدك للمتابعة.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 text-left"
              dir="ltr"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full py-3 rounded-lg bg-brand text-white font-semibold hover:bg-brand-dark disabled:opacity-50 transition"
            >
              {status === "sending" ? "جارٍ الإرسال..." : "أرسل الرابط"}
            </button>
            {status === "error" && (
              <p className="text-red-600 text-sm">{errorMsg}</p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
