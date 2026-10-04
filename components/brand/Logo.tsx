import Link from "next/link";
import { BRAND } from "@/lib/config";

export function Logo({ href = "/", size = "md" }: { href?: string; size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-base";
  return (
    <Link href={href} className={`tape ${cls}`} aria-label={`${BRAND.name}, accueil`}>
      {BRAND.name}
    </Link>
  );
}
