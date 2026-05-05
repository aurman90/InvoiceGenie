import { createClient } from "./supabase/server";

export const FREE_INVOICE_LIMIT = Number(
  process.env.FREE_INVOICE_LIMIT ?? 20,
);

export interface UsageStatus {
  used: number;
  limit: number;
  remaining: number;
  overLimit: boolean;
}

export async function getUsage(userId: string): Promise<UsageStatus> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", userId);

  if (error) throw error;
  const used = count ?? 0;
  const limit = FREE_INVOICE_LIMIT;
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    overLimit: used >= limit,
  };
}
