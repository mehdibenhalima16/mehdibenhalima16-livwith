import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { basicAuthOk } from "@/lib/beta-gate";

const PROTECTED = ["/discover", "/listings", "/messages", "/groups", "/dashboard", "/u/", "/profile", "/settings", "/admin", "/onboarding"];
const AUTH_PAGES = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  // Préproduction : rideau HTTP Basic sur toutes les pages si BETA_BASIC_AUTH est défini.
  const gate = process.env.BETA_BASIC_AUTH;
  if (gate && !basicAuthOk(request.headers.get("authorization"), gate)) {
    return new NextResponse("Accès réservé aux testeurs de Livwith.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Livwith preprod", charset="UTF-8"', "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" },
    });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet, headers) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Vérifie la signature du jeton et rafraîchit la session si besoin.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;

  if (!signedIn && PROTECTED.some((p) => path === p || path.startsWith(p.endsWith("/") ? p : `${p}/`))) {
    const to = request.nextUrl.clone();
    to.pathname = "/login";
    to.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(to);
  }
  if (signedIn && AUTH_PAGES.includes(path)) {
    const to = request.nextUrl.clone();
    to.pathname = "/discover";
    to.search = "";
    return NextResponse.redirect(to);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpg|jpeg|webp|svg|woff2)$).*)"],
};
