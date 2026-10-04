"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { firstIssue, listingSchema } from "@/lib/validation";
import { dbErrorMessage } from "@/lib/format";

export type ActionResult = { error?: string; ok?: boolean };

function toRow(v: z.infer<typeof listingSchema>) {
  const { publish, district, ...rest } = v;
  return { ...rest, district: district || null, status: publish ? "published" : "draft" };
}

export async function saveListing(id: string | null, input: unknown): Promise<ActionResult> {
  const { user, supabase } = await requireProfile();
  const parsed = listingSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  if (parsed.data.photos.some((p) => !p.startsWith(`${user.id}/`))) return { error: "Photo invalide." };
  const row = toRow(parsed.data);
  const res = id
    ? await supabase.from("listings").update(row).eq("id", id).eq("owner_id", user.id).select("id").single()
    : await supabase.from("listings").insert(row).select("id").single();
  if (res.error) return { error: dbErrorMessage(res.error.message) };
  revalidatePath("/listings");
  revalidatePath("/dashboard");
  redirect(`/listings/${res.data.id}`);
}

export async function setListingStatus(id: string, status: "published" | "filled" | "archived" | "draft"): Promise<ActionResult> {
  const { user, supabase } = await requireProfile();
  const { error } = await supabase.from("listings").update({ status }).eq("id", id).eq("owner_id", user.id);
  if (error) return { error: dbErrorMessage(error.message) };
  revalidatePath(`/listings/${id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteListing(id: string): Promise<ActionResult> {
  const { user, supabase } = await requireProfile();
  const { data } = await supabase.from("listings").select("photos").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (!data) return { error: "Annonce introuvable." };
  const { error } = await supabase.from("listings").delete().eq("id", id).eq("owner_id", user.id);
  if (error) return { error: dbErrorMessage(error.message) };
  if (data.photos.length) {
    const { error: storageError } = await createAdminClient().storage.from("listing-photos").remove(data.photos);
    // L'annonce est supprimée ; les photos restantes seront effacées avec le dossier à la suppression du compte.
    if (storageError) console.error("[deleteListing] photos non supprimées", id, storageError.message);
  }
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function toggleFavorite(listingId: string, on: boolean): Promise<ActionResult> {
  const { user, supabase } = await requireProfile();
  const { error } = on
    ? await supabase.from("favorites").insert({ listing_id: listingId })
    : await supabase.from("favorites").delete().eq("user_id", user.id).eq("listing_id", listingId);
  if (error && !error.message.includes("duplicate")) return { error: dbErrorMessage(error.message) };
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function shortlistForGroup(groupId: string, listingId: string, add: boolean): Promise<ActionResult> {
  const { supabase } = await requireProfile();
  const { error } = add
    ? await supabase.from("group_listings").insert({ group_id: groupId, listing_id: listingId })
    : await supabase.from("group_listings").delete().eq("group_id", groupId).eq("listing_id", listingId);
  if (error && !error.message.includes("duplicate")) return { error: dbErrorMessage(error.message) };
  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}
