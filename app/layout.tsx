import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque/standard.css";
import "@fontsource-variable/figtree";
import "./globals.css";
import { BRAND } from "@/lib/config";

export const metadata: Metadata = {
  title: { default: `${BRAND.name} : ${BRAND.tagline}`, template: `%s · ${BRAND.name}` },
  description: "Trouve des colocataires compatibles avant de trouver le logement. Matching réciproque, messagerie sécurisée, groupes pour chercher ensemble.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1d4b3a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
