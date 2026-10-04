# Recette bêta privée : deux comptes

Prépare deux adresses e-mail réelles (A et B) et deux navigateurs distincts, ou un navigateur et une fenêtre privée. Idéalement, B sur un téléphone.
Pour chaque ligne : fais l'action, compare au résultat attendu, coche ou note l'écart (capture d'écran, heure, compte concerné).
Réglages communs : même ville, dates d'emménagement à moins de 60 jours, budgets qui se chevauchent, aucun critère « Impératif » incompatible.

## 0. Accès réservé
- [ ] Dans une fenêtre privée, l'URL de préproduction demande un identifiant ; « Annuler » affiche « Accès réservé aux testeurs ».
- [ ] Avec l'identifiant, inscription avec une adresse NON invitée : message « bêta privée, sur invitation », aucun e-mail reçu, aucun utilisateur créé dans Supabase.
- [ ] Avec la clé publique seule (onglet Réseau du navigateur), une requête vers `/rest/v1/profiles` sans session renvoie une erreur de permission.

## 1. Inscription et e-mails
- [ ] A s'inscrit : message « clique sur le lien envoyé ». E-mail reçu en moins de 2 minutes, expéditeur correct.
- [ ] Le lien ouvre l'onboarding, sur le même appareil puis (compte B) depuis un autre appareil.
- [ ] Mot de passe oublié sur A : e-mail reçu, nouveau mot de passe accepté, connexion possible.
- [ ] Une date de naissance de moins de 18 ans est refusée.

## 2. Photos
- [ ] A ajoute 2 photos (dont une en HEIC depuis un iPhone si possible) : aperçus affichés, « Principale » sur la première.
- [ ] Changer la photo principale, en supprimer une, enregistrer le profil : l'état est conservé après rechargement.
- [ ] Une photo téléchargée depuis l'app ne contient plus de position GPS (vérifier les métadonnées du fichier).

## 3. Découverte
- [ ] A voit B dans Découvrir, et B voit A. Le score est identique des deux côtés.
- [ ] « Pourquoi ce score ? » montre le score réciproque et « face à tes attentes », jamais le détail des attentes de l'autre.
- [ ] Couper le réseau (mode avion), glisser une carte : la carte revient avec un message et « Réessayer ». Rétablir le réseau, réessayer : la carte part.

## 4. Like réciproque et match
- [ ] A propose de se parler à B : aucun effet visible chez B.
- [ ] B propose à A : écran « C'est un match » chez B, conversation dans Messages pour les deux.

## 5. Messages
- [ ] Messages dans les deux sens, affichés sans recharger la page.
- [ ] « Vu » apparaît chez l'expéditeur quand l'autre ouvre la conversation ; compteur de non-lus correct.
- [ ] Message « payez par Western Union avant la visite » : alerte anti-arnaque chez le destinataire.

## 6. Annonce
- [ ] A publie une annonce avec photo à un prix réaliste : statut « Publiée ».
- [ ] B la trouve avec les filtres (ville, budget, type), voit la compatibilité avec A, l'enregistre, clique « Je suis intéressé·e ».
- [ ] A voit la demande sur son annonce et l'accepte (ou retrouve la conversation existante).
- [ ] Une annonce à 150 € à Paris passe « En vérification » ; A (modérateur) l'approuve dans `/admin`.

## 7. Signalement et blocage
- [ ] B signale le profil de A : confirmation affichée ; le signalement apparaît dans `/admin`.
- [ ] B bloque A : conversation fermée des deux côtés, profils introuvables, annonce de A invisible pour B.
- [ ] B débloque A dans Paramètres : A redevient visible dans la découverte seulement s'il n'y a pas déjà eu de choix.

## 8. Suppression
- [ ] B exporte ses données (JSON) : fichier lisible, sans les données de A autres que les matchs.
- [ ] B supprime son compte : retour à l'accueil, connexion impossible, A ne voit plus B.
- [ ] Supabase, Storage : plus aucun fichier dans les dossiers `avatars/<id de B>` et `listing-photos/<id de B>`.
- [ ] Supabase, Authentication : l'utilisateur B n'existe plus.

## À noter pour chaque anomalie
Compte, appareil et navigateur, heure, URL, action, résultat obtenu, capture. Les erreurs serveur sont dans les journaux Vercel (Runtime Logs) ; celles de suppression sont préfixées `[deleteAccount]`.
