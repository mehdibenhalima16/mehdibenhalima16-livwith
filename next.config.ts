import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  experimental: { serverActions: { bodySizeLimit: "1mb" } },
  async headers() {
    // Bêta privée : rien n'est indexé tant que NEXT_PUBLIC_ALLOW_INDEXING ne vaut pas "1".
    const noindex = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "1" ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return [{ source: "/:path*", headers: [...securityHeaders, ...noindex] }];
  },
};
export default config;
