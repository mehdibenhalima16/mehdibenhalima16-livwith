"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Compass, LayoutDashboard, MessageCircle, Shield, Users } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

const ITEMS = [
  { href: "/discover", label: "Découvrir", icon: Compass },
  { href: "/listings", label: "Annonces", icon: Building2 },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/groups", label: "Groupes", icon: Users },
  { href: "/dashboard", label: "Moi", icon: LayoutDashboard },
];

export function AppNav({ unread, admin }: { unread: number; admin: boolean }) {
  const path = usePathname();
  const active = (href: string) => path === href || path.startsWith(`${href}/`);
  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-paper px-4 py-6 md:flex">
        <div className="px-2"><Logo href="/discover" /></div>
        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Navigation principale">
          {ITEMS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-[15px] font-semibold ${active(href) ? "bg-door text-white" : "text-ink hover:bg-plaster"}`}>
              <Icon className="h-5 w-5" aria-hidden />{label}
              {href === "/messages" && unread > 0 && <span className="ml-auto rounded-full bg-blush px-2 text-xs font-bold text-door-deep">{unread}</span>}
            </Link>
          ))}
          {admin && (
            <Link href="/admin" className={`mt-4 flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold ${active("/admin") ? "bg-ink text-white" : "text-muted hover:bg-plaster"}`}>
              <Shield className="h-5 w-5" aria-hidden />Modération
            </Link>
          )}
        </nav>
      </aside>
      <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {ITEMS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}
            className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${active(href) ? "text-door" : "text-muted"}`}>
            <Icon className="h-6 w-6" aria-hidden />{label}
            {href === "/messages" && unread > 0 && <span className="absolute right-[26%] top-1.5 h-2.5 w-2.5 rounded-full bg-blush-deep" aria-label={`${unread} non lus`} />}
          </Link>
        ))}
      </nav>
    </>
  );
}
