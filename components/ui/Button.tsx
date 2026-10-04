import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "blush";
const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed select-none whitespace-nowrap";
const variants: Record<Variant, string> = {
  primary: "bg-door text-white hover:bg-door-hover",
  secondary: "bg-paper text-ink border border-line hover:border-door",
  ghost: "text-door hover:bg-door/8",
  danger: "bg-paper text-alert border border-alert/40 hover:bg-alert-soft",
  blush: "bg-blush text-door-deep hover:bg-blush-deep",
};
const sizes = { sm: "h-9 px-4 text-sm", md: "h-11 px-5 text-[15px]", lg: "h-13 px-7 text-base" };

export function buttonClass(variant: Variant = "primary", size: keyof typeof sizes = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

export function Button({ variant = "primary", size = "md", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <button {...props} className={buttonClass(variant, size, className)} />;
}

export function ButtonLink({ href, variant = "primary", size = "md", className = "", children }: { href: string; variant?: Variant; size?: keyof typeof sizes; className?: string; children: ReactNode }) {
  return <Link href={href} className={buttonClass(variant, size, className)}>{children}</Link>;
}
