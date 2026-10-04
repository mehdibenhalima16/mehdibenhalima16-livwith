"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/server/auth";
import { CITY_SLUGS } from "@/lib/config";
import { dbErrorMessage } from "@/lib/format";
import { firstIssue } from "@/lib/validation";

const groupSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(50),
  city: z.enum(CITY_SLUGS),
  budget: z.coerce.number().int().min(100).max(5000),
  target_size: z.coerce.number().int().min(2).max(6),
  move_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
  description: z.string().trim().max(500).default(""),
});

export async function createGroup(_: unknown, form: FormData): Promise<{ error?: string }> {
  const { supabase } = await requireProfile();
  const parsed = groupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const v = parsed.data;
  const { data, error } = await supabase.rpc("create_group", {
    p_name: v.name, p_city: v.city, p_budget: v.budget, p_target_size: v.target_size,
    p_move_in: v.move_in || null, p_description: v.description,
  });
  if (error) return { error: dbErrorMessage(error.message) };
  redirect(`/groups/${data}`);
}

export async function inviteToGroup(groupId: string, userId: string) {
  const { supabase } = await requireProfile();
  const { error } = await supabase.rpc("invite_to_group", { p_group: groupId, p_user: userId });
  if (error) return { error: dbErrorMessage(error.message) };
  revalidatePath(`/groups/${groupId}`);
  return {};
}

export async function respondInvite(groupId: string, accept: boolean) {
  const { supabase } = await requireProfile();
  const { error } = await supabase.rpc("respond_group_invite", { p_group: groupId, p_accept: accept });
  if (error) return { error: dbErrorMessage(error.message) };
  revalidatePath("/groups");
  revalidatePath("/dashboard");
  if (accept) redirect(`/groups/${groupId}`);
  return {};
}

export async function leaveGroup(groupId: string) {
  const { supabase } = await requireProfile();
  const { error } = await supabase.rpc("leave_group", { p_group: groupId });
  if (error) return { error: dbErrorMessage(error.message) };
  revalidatePath("/groups");
  redirect("/groups");
}
