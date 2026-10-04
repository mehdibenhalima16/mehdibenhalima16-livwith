import { Logo } from "@/components/brand/Logo";
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-5 pb-20">
      <header className="py-5"><Logo /></header>
      <p className="mb-6 rounded-2xl bg-amber-soft px-4 py-3 text-sm"><strong>Modèle à faire valider par un juriste avant lancement.</strong> Les mentions entre crochets sont à compléter.</p>
      <article className="space-y-4 leading-relaxed [&_h1]:font-display [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold">{children}</article>
    </div>
  );
}
