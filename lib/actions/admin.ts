"use server";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/server/auth";

async function run(fn: string, args: Record<string, unknown>) {
  const { supabase } = await requireProfile();
  const { error } = await supabase.rpc(fn, args); // la base refuse si l'appelant n'est pas admin
  revalidatePath("/admin");
  return error ? { error: "Action refusée." } : {};
}

export const moderateListing = async (id: string, status: "published" | "removed", reason?: string) =>
  run("admin_set_listing_status", { p_listing: id, p_status: status, p_reason: reason ?? null });
export const suspendUser = async (id: string, suspend: boolean) => run("admin_suspend_user", { p_user: id, p_suspend: suspend });
export const resolveReport = async (id: string, status: "actioned" | "dismissed") =>
  run("admin_resolve_report", { p_report: id, p_status: status, p_note: null });
