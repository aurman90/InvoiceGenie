"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CustomerRow({
  id,
  name,
  vatNumber,
  email,
  createdAt,
}: {
  id: string;
  name: string;
  vatNumber: string | null;
  email: string | null;
  createdAt: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    if (!confirm(`حذف العميل "${name}"؟ لن تتأثر الفواتير السابقة.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error || "تعذّر الحذف");
        setDeleting(false);
        return;
      }
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
      setDeleting(false);
    }
  }

  return (
    <tr className="border-t border-gray-100">
      <td className="px-4 py-3 font-semibold">{name}</td>
      <td className="px-4 py-3 font-mono text-sm text-gray-600">
        {vatNumber || "—"}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{email || "—"}</td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {new Date(createdAt).toLocaleDateString("ar-SA")}
      </td>
      <td className="px-4 py-3 text-left">
        <Link
          href={`/customers/${id}`}
          className="text-brand hover:underline ml-4"
        >
          تعديل
        </Link>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="text-red-600 hover:text-red-800 disabled:opacity-50"
        >
          {deleting ? "..." : "حذف"}
        </button>
      </td>
    </tr>
  );
}
