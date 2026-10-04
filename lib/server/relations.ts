import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Conversation directe avec une personne si vous avez matché, sinon null. */
export async function conversationWith(supabase: SupabaseClient, me: string, other: string) {
  const [a, b] = me < other ? [me, other] : [other, me];
  const { data: m } = await supabase.from("matches").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
  if (!m) return null;
  const { data: c } = await supabase.from("conversations").select("id").eq("match_id", m.id).maybeSingle();
  return c?.id ?? null;
}

export async function myActiveGroups(supabase: SupabaseClient, me: string) {
  const { data } = await supabase.from("group_members").select("group_id, groups(id, name)").eq("user_id", me).eq("status", "active");
  return ((data ?? []) as unknown as { group_id: string; groups: { id: string; name: string } | null }[])
    .filter((g) => g.groups).map((g) => ({ id: g.group_id, name: g.groups!.name }));
}
