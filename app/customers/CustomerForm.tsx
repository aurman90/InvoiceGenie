"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type CustomerFormValues = {
  name: string;
  address: string;
  commercial_register: string;
  vat_number: string;
  email: string;
};

export const EMPTY_CUSTOMER: CustomerFormValues = {
  name: "",
  address: "",
  commercial_register: "",
  vat_number: "",
  email: "",
};

interface Props {
  initial: CustomerFormValues;
  /** Set when editing an existing customer. */
  customerId?: string;
  /** Called with the saved customer on success. Defaults to navigating to /customers. */
  onSaved?: (customer: { id: string } & CustomerFormValues) => void;
  /** Override the submit label. */
  submitLabel?: string;
  /** Whether to show the delete button (edit mode). */
  showDelete?: boolean;
}

export function CustomerForm({
  initial,
  customerId,
  onSaved,
  submitLabel,
  showDelete,
}: Props) {
  const router = useRouter();
  const [values, setValues] = useState<CustomerFormValues>(initial);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patch(k: keyof CustomerFormValues, v: string) {
    setValues((prev) => ({ ...prev, [k]: v }));
  }

  function validate(): string | null {
    if (!values.name.trim()) return "اسم العميل مطلوب.";
    if (values.vat_number && !/^\d{15}$/.test(values.vat_number.trim())) {
      return "الرقم الضريبي يجب أن يكون ١٥ رقماً.";
    }
    if (
      values.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())
    ) {
      return "الإيميل غير صالح.";
    }
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSaving(true);

    const body = {
      name: values.name.trim(),
      address: values.address.trim() || undefined,
      commercial_register: values.commercial_register.trim() || undefined,
      vat_number: values.vat_number.trim() || undefined,
      email: values.email.trim() || undefined,
    };

    try {
      const res = await fetch(
        customerId ? `/api/customers/${customerId}` : "/api/customers",
        {
          method: customerId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.details || j.error || "تعذّر الحفظ");
      }
      const { customer } = await res.json();
      if (onSaved) {
        onSaved(customer);
      } else {
        router.push("/customers");
        router.refresh();
      }
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!customerId) return;
    if (
      !confirm(
        `حذف العميل "${values.name}"؟ لن تتأثر الفواتير السابقة.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "تعذّر الحذف");
      }
      router.push("/customers");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setDeleting(false);
    }
  }

  const busy = saving || deleting;

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 bg-white rounded-xl border border-gray-200 p-6"
    >
      <Field
        label="اسم العميل"
        required
        value={values.name}
        onChange={(v) => patch("name", v)}
        disabled={busy}
      />
      <Field
        label="العنوان"
        value={values.address}
        onChange={(v) => patch("address", v)}
        disabled={busy}
      />
      <Field
        label="السجل التجاري"
        value={values.commercial_register}
        onChange={(v) => patch("commercial_register", v)}
        disabled={busy}
        dir="ltr"
      />
      <Field
        label="الرقم الضريبي (١٥ رقم)"
        value={values.vat_number}
        onChange={(v) => patch("vat_number", v)}
        disabled={busy}
        dir="ltr"
        placeholder="310122393500003"
        mono
      />
      <Field
        label="الإيميل"
        value={values.email}
        onChange={(v) => patch("email", v)}
        disabled={busy}
        dir="ltr"
        type="email"
      />

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={busy}
          className="flex-1 py-3 rounded-lg bg-brand text-white font-semibold hover:bg-brand-dark disabled:opacity-50 transition"
        >
          {saving ? "جارٍ الحفظ..." : submitLabel || "حفظ"}
        </button>
        {showDelete && customerId && (
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="px-6 py-3 rounded-lg border border-red-300 text-red-700 font-semibold hover:bg-red-50 disabled:opacity-50 transition"
          >
            {deleting ? "..." : "حذف"}
          </button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  value,
  onChange,
  disabled,
  dir,
  placeholder,
  type,
  mono,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  dir?: "ltr" | "rtl";
  placeholder?: string;
  type?: string;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      <input
        type={type || "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        dir={dir}
        placeholder={placeholder}
        className={`w-full px-4 py-3 rounded-lg border border-gray-300 ${
          mono ? "font-mono" : ""
        }`}
      />
    </label>
  );
}
