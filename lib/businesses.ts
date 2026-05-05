import { z } from "zod";

export const INVOICE_TEMPLATES = ["classic", "modern", "minimal"] as const;
export type InvoiceTemplate = (typeof INVOICE_TEMPLATES)[number];

export const businessInputSchema = z.object({
  name_ar: z.string().trim().min(1, "اسم المنشأة مطلوب"),
  name_en: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  vat_number: z
    .string()
    .trim()
    .regex(/^\d{15}$/, "الرقم الضريبي يجب أن يكون ١٥ رقماً"),
  address_ar: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  logo_url: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  brand_color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "لون غير صالح")
    .default("#0f766e"),
  invoice_template: z.enum(INVOICE_TEMPLATES).default("classic"),
  invoice_notes: z
    .string()
    .trim()
    .max(500, "الملاحظات طويلة جداً")
    .optional()
    .transform((v) => (v ? v : undefined)),
  invoice_settings: z.any().optional(),
  stamp_url: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type BusinessInput = z.infer<typeof businessInputSchema>;

export interface Business extends BusinessInput {
  id: string;
  owner_id: string;
  created_at: string;
}
