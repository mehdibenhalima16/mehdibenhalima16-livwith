import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return process.env.NEXT_PUBLIC_ALLOW_INDEXING === "1"
    ? { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/design"] } }
    : { rules: { userAgent: "*", disallow: "/" } };
}
