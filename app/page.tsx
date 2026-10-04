import { Logo } from "@/components/brand/Logo";
import { Intercom } from "@/components/brand/Intercom";
import { ButtonLink } from "@/components/ui/Button";
import { BRAND } from "@/lib/config";
import { Handshake, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";

export default async function Landing({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <span className="hidden sm:block"><ButtonLink href="/login" variant="ghost" size="sm">Se connecter</ButtonLink></span>
          <span className="sm:hidden"><ButtonLink href="/login" variant="secondary" size="sm">Connexion</ButtonLink></span>
          <span className="hidden sm:block"><ButtonLink href="/signup" size="sm">Créer un compte</ButtonLink></span>
        </nav>
      </header>

      {deleted && (
        <p role="status" className="mx-auto max-w-6xl px-5 text-sm text-door-deep">Ton compte et tes données ont été supprimés.</p>
      )}

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-8 md:grid-cols-[1.15fr_1fr] md:pt-16">
          <div>
            <h1 className="font-display text-[44px] font-extrabold leading-[1.02] tracking-tight text-ink sm:text-6xl">
              D&apos;abord les bonnes personnes.
              <span className="block text-door">Ensuite, le logement.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">
              {BRAND.name} te présente des colocataires compatibles avec ta façon de vivre : propreté, horaires, calme, invités.
              Vous vous choisissez tous les deux, puis vous parlez. Avec ou sans appartement.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/signup" size="lg">Commencer, c&apos;est gratuit</ButtonLink>
              <ButtonLink href="/login" variant="secondary" size="lg">J&apos;ai déjà un compte</ButtonLink>
            </div>
            <p className="mt-4 text-sm text-muted">Réservé aux 18 ans et plus. Ton adresse n&apos;est jamais publiée.</p>
          </div>
          <Intercom />
        </section>

        <section className="border-t border-line bg-paper">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 md:grid-cols-3">
            {[
              { icon: Handshake, title: "Un match, c'est un double oui", text: "Personne ne peut t'écrire sans que tu l'aies choisi. Fini les 200 messages à trier." },
              { icon: Users, title: "Pas encore de logement ?", text: "Forme un groupe avec tes matchs, comparez vos annonces favorites, cherchez ensemble." },
              { icon: ShieldCheck, title: "La confiance d'abord", text: "Annonces contrôlées, alertes anti-arnaque dans le chat, blocage et signalement en un geste." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title}>
                <Icon className="h-7 w-7 text-door" aria-hidden />
                <h2 className="mt-3 font-display text-xl font-bold">{title}</h2>
                <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="font-display text-3xl font-bold">Comment le score est calculé</h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
            Tu réponds à 10 questions sur ta façon de vivre, puis tu dis ce que tu acceptes chez les autres et ce qui compte vraiment.
            Le pourcentage mesure la correspondance dans les deux sens. Ce n&apos;est pas une promesse d&apos;entente :
            c&apos;est une bonne raison de se parler.
          </p>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-muted">
          <span>{BRAND.name} · {BRAND.tagline}</span>
          <span className="flex gap-4">
            <Link href="/legal/privacy" className="hover:text-ink">Confidentialité</Link>
            <Link href="/legal/terms" className="hover:text-ink">Conditions</Link>
            <Link href="/legal/notice" className="hover:text-ink">Mentions légales</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
