"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Status = "idle" | "recording" | "transcribing" | "parsing" | "saving";

export default function NewInvoicePage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [source, setSource] = useState<"text" | "voice">("text");

  async function submit(finalText: string, submittedSource: "text" | "voice") {
    setError(null);
    setStatus("parsing");
    try {
      const parseRes = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: finalText }),
      });
      if (!parseRes.ok) {
        const j = await parseRes.json();
        throw new Error(j.details || j.error || "parse failed");
      }
      const { parsed } = await parseRes.json();

      setStatus("saving");
      const saveRes = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parsed, source: submittedSource }),
      });
      if (!saveRes.ok) {
        const j = await saveRes.json();
        if (saveRes.status === 402) {
          throw new Error(
            j.message || "انتهت باقتك المجانية. يرجى الاشتراك للمتابعة.",
          );
        }
        if (saveRes.status === 400 && j.error === "missing_business") {
          throw new Error("أكمل بيانات المنشأة أولاً من صفحة الإعدادات.");
        }
        throw new Error(j.details || j.error || "save failed");
      }
      const { invoice } = await saveRes.json();
      router.push(`/invoices/${invoice.id}`);
    } catch (e) {
      setError((e as Error).message);
      setStatus("idle");
    }
  }

  async function onSubmitText(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSource("text");
    await submit(text.trim(), "text");
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setStatus("transcribing");
        const form = new FormData();
        form.append("audio", new File([blob], "voice.webm", { type: "audio/webm" }));
        try {
          const res = await fetch("/api/transcribe", {
            method: "POST",
            body: form,
          });
          if (!res.ok) {
            const j = await res.json();
            throw new Error(j.details || j.error || "transcribe failed");
          }
          const { text: transcript } = await res.json();
          setText(transcript);
          setSource("voice");
          await submit(transcript, "voice");
        } catch (e) {
          setError((e as Error).message);
          setStatus("idle");
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setStatus("recording");
    } catch (e) {
      setError("تعذّر الوصول إلى الميكروفون: " + (e as Error).message);
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  const busy = status !== "idle";

  return (
    <main className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold text-brand">
            InvoiceGenie
          </Link>
          <Link href="/dashboard" className="text-sm hover:text-brand">
            ← لوحة التحكم
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-bold mb-2">فاتورة جديدة</h1>
        <p className="text-gray-600 mb-8">
          اكتب أو قل الفاتورة بلغتك الطبيعية. مثال: &ldquo;فاتورة لأحمد ٥٠٠ ريال
          مقابل دهان&rdquo;.
        </p>

        <form
          onSubmit={onSubmitText}
          className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
            rows={4}
            placeholder="فاتورة لأحمد ٥٠٠ ريال مقابل دهان"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 resize-none text-lg leading-relaxed"
          />

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={busy || !text.trim()}
              className="flex-1 py-3 rounded-lg bg-brand text-white font-semibold hover:bg-brand-dark disabled:opacity-50 transition"
            >
              {status === "parsing" && "جارٍ التحليل..."}
              {status === "saving" && "جارٍ الحفظ..."}
              {status === "idle" && "إنشاء الفاتورة"}
              {status === "recording" && "جارٍ التسجيل..."}
              {status === "transcribing" && "جارٍ التحويل..."}
            </button>

            {status === "recording" ? (
              <button
                type="button"
                onClick={stopRecording}
                className="px-6 py-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition"
              >
                ⏹ إيقاف
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                disabled={busy}
                className="px-6 py-3 rounded-lg border border-gray-300 font-semibold hover:bg-gray-50 disabled:opacity-50 transition"
                title="تسجيل صوتي"
              >
                🎤
              </button>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
              {error}
            </div>
          )}
        </form>

        <p className="mt-4 text-sm text-gray-500">
          المصدر الحالي:{" "}
          <span className="font-semibold">
            {source === "text" ? "نص" : "صوت"}
          </span>
        </p>
      </div>
    </main>
  );
}
