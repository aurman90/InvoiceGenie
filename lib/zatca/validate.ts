import { z } from "zod";

export const lineItemSchema = z.object({
  description: z.string().min(1),
  qty: z.number().positive().default(1),
  /** Unit price, VAT-exclusive, in SAR. */
  unit_price: z.number().nonnegative(),
  /** VAT rate as a decimal — 0.15 = 15%. */
  vat_rate: z.number().min(0).max(1).default(0.15),
});

export const parsedInvoiceSchema = z.object({
  customer_name: z.string().min(1),
  customer_vat: z.string().optional(),
  line_items: z.array(lineItemSchema).min(1),
});

export type LineItem = z.infer<typeof lineItemSchema>;
export type ParsedInvoice = z.infer<typeof parsedInvoiceSchema>;

/** Saudi Arabia uses a 15-digit VAT registration number. */
export const vatNumberSchema = z
  .string()
  .regex(/^\d{15}$/, "VAT number must be 15 digits");

export interface InvoiceTotals {
  subtotal: number;
  vat_amount: number;
  total: number;
}

/** Computes subtotal, VAT, and total from line items (all VAT-exclusive). */
export function computeTotals(items: LineItem[]): InvoiceTotals {
  let subtotal = 0;
  let vat_amount = 0;
  for (const li of items) {
    const line = li.qty * li.unit_price;
    subtotal += line;
    vat_amount += line * li.vat_rate;
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    subtotal: round(subtotal),
    vat_amount: round(vat_amount),
    total: round(subtotal + vat_amount),
  };
}
