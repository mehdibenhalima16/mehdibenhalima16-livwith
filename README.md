# Livwith : MVP de colocation « d'abord les personnes »

Next.js 16 (App Router) + Supabase (Postgres, Auth, Storage, Realtime). Toute la sécurité est portée par la base (RLS, fonctions contrôlées) : l'interface n'est jamais la seule barrière.

## 1. Prérequis
Node 20.9+ (22 recommandé), un compte Supabase (projet en région UE), un compte Vercel pour la mise en ligne.

## 2. Créer le projet Supabase
1. Créer un projet (région Europe, ex. Paris ou Francfort).
2. SQL Editor → exécuter `supabase/migrations/20260929000000_init.sql`, puis `20261001000000_beta_access.sql` (bêta sur invitation), une seule fois chacun, dans cet ordre. Inviter les testeurs : `insert into public.beta_allowlist (email) values ('…');`. Alternative : `supabase link` puis `supabase db push`.
3. Authentication → Sign In / Providers → Email : activé, « Confirm email » activé.
4. Authentication → URL Configuration : Site URL = l'URL de l'app ; Redirect URLs = `http://localhost:3000/**` et `https://<ton-domaine>/**`.
5. (Recommandé) Modèles d'e-mail « Confirm signup » et « Reset password » : remplacer le lien par
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/onboarding` (inscription) et
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password` (réinitialisation).
   Cela permet d'ouvrir le lien sur un autre appareil que celui de l'inscription. Le lien par défaut (`?code=`) fonctionne aussi, sur le même navigateur.
6. Authentication → SMTP : brancher un SMTP (Resend, Postmark, Brevo…). Le SMTP intégré de Supabase est limité à quelques e-mails par heure : insuffisant pour des tests à plusieurs.
7. Database → Replication : vérifier que `messages` et `conversation_participants` sont dans la publication `supabase_realtime` (la migration les ajoute).

## 3. Lancer en local
```bash
cp .env.example .env.local   # renseigner URL, clé anon/publishable, clé service_role/secret
npm install
npm run dev                  # http://localhost:3000
```
Données fictives (profils marqués « Démo ») : `npm run seed:demo -- --city=paris` ; suppression : `npm run seed:clean`.

Devenir modérateur : dans le SQL Editor, `insert into public.admins (user_id) select id from auth.users where email = 'toi@exemple.fr';` puis ouvrir `/admin`.

## 4. Tests
```bash
npm test          # matching, confidentialité, pile de cartes, suppression de compte, rideau d'accès, validation (28 tests)
npm run test:db   # sécurité de la base sur un PostgreSQL local jetable (19 tests)
npm run typecheck
```
`test:db` utilise `scripts/pg-local.sh` (PostgreSQL 16 local, port 54329). Sur une autre machine : définir `TEST_DATABASE_URL_ADMIN=postgres://user:pass@host:port/postgres` et supprimer l'appel au script.

## 5. Déployer sur Vercel
1. Pousser le dépôt sur GitHub, l'importer dans Vercel (framework détecté : Next.js).
2. Variables d'environnement (Production et Preview) : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL=https://<ton-domaine>`.
3. Ajouter le domaine Vercel dans les Redirect URLs Supabase, puis mettre à jour la Site URL.

## 6. Préproduction et recette
Guide pas à pas : `docs/PREPROD.md`. Recette détaillée à deux comptes : `docs/RECETTE-BETA.md`.
Informations légales à fournir : `lib/legal.ts` (vides tant que l'éditeur ne les a pas renseignées).

### Recette rapide (2 vrais comptes, 2 navigateurs)
- [ ] Inscription A et B, réception et clic du lien de confirmation, onboarding complet avec photo.
- [ ] Mêmes ville, dates à moins de 60 jours, budgets qui se chevauchent : A voit B dans Découvrir, et inversement.
- [ ] A like B : rien ne se passe. B like A : écran de match, conversation créée.
- [ ] Messages en temps réel dans les deux sens, « Vu » qui apparaît, compteur non lus.
- [ ] Envoyer « payez par Western Union avant la visite » : alerte anti-arnaque côté destinataire.
- [ ] A publie une annonce avec photo ; B la trouve avec les filtres, clique « Je suis intéressé·e » ; A accepte depuis l'annonce.
- [ ] Annonce à 150 € à Paris : passe « En vérification » ; l'admin l'approuve dans `/admin`.
- [ ] Groupe : A crée, invite B (match), B accepte, chat du groupe, annonce proposée au groupe.
- [ ] Signalement d'un profil, blocage : conversation fermée, profils invisibles l'un pour l'autre.
- [ ] Export JSON des données, mise en pause, suppression du compte.
- [ ] Test sur téléphone réel (iOS Safari et Android Chrome) : upload photo HEIC, glisser les cartes.

## 7. Ce qui est vérifié, ce qui ne l'est pas
Vérifié ici : 25 tests de sécurité SQL, dont l'invitation obligatoire, (RLS, droits colonne, déclencheurs, RPC) sur PostgreSQL 16 avec des doublures des rôles Supabase ; 28 tests unitaires ; typage strict ; build de production ; rendu visuel des écrans publics et des composants (`/design`).
Non vérifié : parcours de bout en bout sur un vrai projet Supabase (e-mails, Storage, Realtime, URL signées). À faire avec la recette ci-dessus avant toute ouverture.

## Arborescence
`supabase/` schéma et tests · `lib/` logique (matching, validation, actions serveur) · `components/` interface · `app/` routes · `tests/` unitaires et base · `scripts/` outils.
