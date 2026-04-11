"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition"
    >
      ⬇ تحميل / طباعة PDF
    </button>
  );
}
