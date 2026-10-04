import { Logo } from "@/components/brand/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-5 py-5"><Logo /></header>
      <main className="flex flex-1 items-start justify-center px-5 pb-16 pt-6 sm:pt-12">
        <div className="w-full max-w-md rounded-[var(--radius-card)] border border-line bg-paper p-6 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
