import { z } from "zod";

/**
 * Customer validation shared between the /customers form, the API routes,
 * and the invoice creation flow. Only `name` is required; everything else
 * is optional. When a field is provided, we still validate its shape so
 * bad data never reaches the database.
 */
export const customerInputSchema = z.object({
  name: z.string().trim().min(1, "الاسم مطلوب"),
  address: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  commercial_register: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  vat_number: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine(
      (v) => v === undefined || /^\d{15}$/.test(v),
      "الرقم الضريبي يجب أن يكون ١٥ رقماً",
    ),
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine(
      (v) => v === undefined || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "الإيميل غير صالح",
    ),
});

export type CustomerInput = z.infer<typeof customerInputSchema>;

export interface Customer extends CustomerInput {
  id: string;
  owner_id: string;
  created_at: string;
}
