import { AppNav } from "@/components/app/AppNav";
import { isAdmin, requireProfile } from "@/lib/server/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase } = await requireProfile();
  const [, convs, admin] = await Promise.all([
    supabase.rpc("touch_last_active"),
    supabase.rpc("my_conversations"),
    isAdmin(),
  ]);
  const unread = ((convs.data ?? []) as { unread: number }[]).reduce((s, c) => s + (c.unread > 0 ? 1 : 0), 0);
  return (
    <div className="min-h-dvh md:pl-60">
      <AppNav unread={unread} admin={admin} />
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 md:pb-12 md:pt-10">{children}</main>
    </div>
  );
}
