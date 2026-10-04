# Préproduction Livwith : configuration pas à pas

Objectif : une URL de préproduction privée, non indexée, branchée à un projet Supabase dédié. Rien n'est publié en production.
Fais une étape, vérifie son contrôle, puis passe à la suivante. Les libellés de l'interface Supabase ou Vercel peuvent légèrement varier.

| # | Étape | Contrôle |
| --- | --- | --- |
| 1 | Supabase : créer un projet dédié `livwith-preprod`, région Europe, mot de passe de base rangé dans un gestionnaire | Le projet apparaît « Healthy » |
| 2 | SQL Editor : exécuter `supabase/migrations/20260929000000_init.sql`, puis `20261001000000_beta_access.sql`, chacun une seule fois et dans cet ordre | `select count(*) from public.cities;` renvoie 12 ; `select invite_only from public.beta_settings;` renvoie true |
| 2 bis | Inviter les deux testeurs : `insert into public.beta_allowlist (email, note) values ('…', 'Compte A'), ('…', 'Compte B');` | Une inscription avec une autre adresse est refusée |
| 3 | Project Settings, API : noter l'URL du projet, la clé publique (anon ou publishable) et la clé secrète (service_role ou secret) | Trois valeurs notées, la clé secrète jamais partagée |
| 4 | Local : `.env.local` rempli avec ces valeurs, `npm run dev`, création d'un compte de test | L'onboarding s'ouvre après confirmation |
| 5 | GitHub : dépôt privé, code poussé sur une branche `preprod` | Le dépôt est privé |
| 6 | Vercel : nouveau projet `livwith-preprod` importé depuis ce dépôt, branche de production du projet = `preprod`, variables d'environnement renseignées, `NEXT_PUBLIC_ALLOW_INDEXING=0`, `BETA_BASIC_AUTH=identifiant:motdepasse` (mot de passe long, partagé aux seuls testeurs) | L'URL demande un identifiant ; avec, la page d'accueil s'affiche |
| 7 | Supabase Auth, URL Configuration : Site URL = l'URL de préproduction ; Redirect URLs = cette URL suivie de `/**` et `http://localhost:3000/**` | Un lien de confirmation ramène sur la préproduction |
| 8 | Supabase Auth, modèles d'e-mail : liens `token_hash` (voir README, section 2) | Le lien fonctionne depuis un autre appareil |
| 9 | Supabase Auth, SMTP : brancher un fournisseur d'e-mails transactionnels avec un domaine d'envoi vérifié | Deux inscriptions de suite reçoivent leur e-mail |
| 10 | Mettre `NEXT_PUBLIC_SITE_URL` à l'URL de préproduction dans Vercel, redéployer | Les e-mails pointent vers la préproduction |
| 11 | Se déclarer modérateur : `insert into public.admins …` (README) | `/admin` s'ouvre |
| 12 | Dérouler `docs/RECETTE-BETA.md` avec deux comptes | Toutes les cases cochées |

## Qui peut accéder à quoi

| Couche | Protège | Limite |
| --- | --- | --- |
| Invitation en base (déclencheur sur `auth.users`) | Création de compte par tous les chemins, y compris un appel direct à l'API Auth avec la clé publique | Aucune donnée n'est lisible sans compte ; c'est la vraie barrière |
| RLS et droits | Aucune table, fonction ou photo lisible sans être connecté | Vérifié par les tests de base |
| Rideau HTTP Basic (`BETA_BASIC_AUTH`) | Les pages de l'application, y compris l'accueil et les pages légales | Les fichiers statiques (JS, polices, icône) restent servis : ils contiennent l'URL Supabase et la clé publique, qui ne donnent accès à rien sans invitation |
| Non-indexation | Référencement par les moteurs | Aucune protection d'accès à elle seule |

Ne jamais ajouter la clé `service_role` dans une variable commençant par `NEXT_PUBLIC_`. Ne pas activer de fournisseur de connexion (Google, téléphone, anonyme) pendant la bêta : le déclencheur les bloquerait, mais inutile d'ouvrir la porte.
