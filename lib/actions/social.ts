"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/server/auth";
import { buildDeck } from "@/lib/server/discovery";
import { dbErrorMessage } from "@/lib/format";
import type { DeckCard } from "@/lib/types";

const uuid = z.string().uuid();

export type SwipeResult = { error?: string; matched?: boolean; conversationId?: string };

export async function swipeAction(target: string, liked: boolean, listingId?: string | null): Promise<SwipeResult> {
  const { supabase } = await requireProfile();
  if (!uuid.safeParse(target).success || (listingId && !uuid.safeParse(listingId).success)) return { error: "Requête invalide." };
  const { data, error } = await supabase.rpc("swipe", { p_target: target, p_liked: liked, p_listing: listingId ?? null });
  if (error) return { error: dbErrorMessage(error.message) };
  const r = data as { matched: boolean; conversation_id?: string };
  if (r.matched) revalidatePath("/dashboard");
  return { matched: r.matched, conversationId: r.conversation_id };
}

export async function loadMoreCards(exclude: string[]): Promise<DeckCard[]> {
  const { user } = await requireProfile();
  return buildDeck(user.id, exclude.filter((id) => uuid.safeParse(id).success).slice(0, 200));
}

export async function blockUser(target: string): Promise<{ error?: string }> {
  const { supabase } = await requireProfile();
  if (!uuid.safeParse(target).success) return { error: "Requête invalide." };
  const { error } = await supabase.from("blocks").insert({ blocked: target });
  if (error && !error.message.includes("duplicate")) return { error: dbErrorMessage(error.message) };
  revalidatePath("/", "layout");
  return {};
}

export async function unblockUser(target: string): Promise<{ error?: string }> {
  const { user, supabase } = await requireProfile();
  const { error } = await supabase.from("blocks").delete().eq("blocker", user.id).eq("blocked", target);
  if (error) return { error: dbErrorMessage(error.message) };
  revalidatePath("/settings");
  return {};
}

const reportSchema = z.object({
  kind: z.enum(["user", "listing", "message"]),
  id: z.string().min(1).max(64),
  reason: z.enum(["fake", "scam", "harassment", "inappropriate", "discrimination", "underage", "other"]),
  details: z.string().trim().max(1000).default(""),
});

export async function reportContent(input: unknown): Promise<{ error?: string; ok?: boolean }> {
  const { supabase } = await requireProfile();
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return { error: "Signalement invalide." };
  const { kind, id, reason, details } = parsed.data;
  const target =
    kind === "user" ? { target_user: id } : kind === "listing" ? { target_listing: id } : { target_message: Number(id) };
  const { error } = await supabase.from("reports").insert({ ...target, reason, details });
  if (error) return { error: dbErrorMessage(error.message) };
  return { ok: true };
}
