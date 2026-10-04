import { Logo } from "@/components/brand/Logo";
import { legal } from "@/lib/legal";

export default function Suspended() {
  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <Logo />
      <h1 className="mt-8 font-display text-3xl font-bold">Compte suspendu</h1>
      <p className="mt-3 text-muted">Ton compte a été suspendu par la modération à la suite de signalements. Pour contester, écris à {legal("contactEmail")}.</p>
      <form action="/auth/signout" method="post" className="mt-6"><button className="text-door underline">Se déconnecter</button></form>
    </main>
  );
}
