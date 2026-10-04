import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/server/auth";

// Droit d'accès et de portabilité (RGPD art. 15 et 20) : uniquement les données de l'utilisateur, via la RLS.
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const s = await createClient();
  const [profile, priv, listings, swipes, matches, messages, groups, favorites, blocks, reports] = await Promise.all([
    s.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    s.from("profiles_private").select("*").eq("id", user.id).maybeSingle(),
    s.from("listings").select("*").eq("owner_id", user.id),
    s.from("swipes").select("*").eq("swiper", user.id),
    s.from("matches").select("*"),
    s.from("messages").select("id, conversation_id, body, created_at").eq("sender_id", user.id),
    s.from("group_members").select("*").eq("user_id", user.id),
    s.from("favorites").select("*").eq("user_id", user.id),
    s.from("blocks").select("*").eq("blocker", user.id),
    s.from("reports").select("*").eq("reporter", user.id),
  ]);
  const body = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email },
    profile: profile.data, private: priv.data, listings: listings.data, swipes: swipes.data, matches: matches.data,
    messages_sent: messages.data, groups: groups.data, favorites: favorites.data, blocks: blocks.data, reports: reports.data,
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="livwith-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
