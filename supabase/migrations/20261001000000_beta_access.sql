-- =============================================================================
-- Livwith : accès sur invitation pour la bêta privée.
-- À exécuter APRÈS 20260929000000_init.sql.
-- Barrière réelle : un déclencheur sur auth.users refuse toute création de compte
-- dont l'e-mail n'est pas invité, quel que soit le chemin (formulaire, appel direct
-- à l'API Auth avec la clé publique, lien magique, connexion anonyme, tableau de bord).
-- Échec fermé : si le réglage est absent, l'accès reste sur invitation.
-- =============================================================================

create table public.beta_allowlist (
  email text primary key check (email = lower(btrim(email)) and email like '%@%'),
  note text,
  added_at timestamptz not null default now()
);

create table public.beta_settings (
  id boolean primary key default true check (id),
  invite_only boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.beta_settings (id, invite_only) values (true, true);

alter table public.beta_allowlist enable row level security;
alter table public.beta_settings enable row level security;
-- Aucune politique : illisibles et non modifiables pour anon et authenticated.
revoke all on public.beta_allowlist, public.beta_settings from anon, authenticated;
grant all on public.beta_allowlist, public.beta_settings to service_role;

create or replace function public.beta_email_allowed(p_email text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not coalesce((select invite_only from public.beta_settings where id), true)
      or exists (select 1 from public.beta_allowlist where email = lower(btrim(coalesce(p_email, ''))))
$$;
revoke all on function public.beta_email_allowed(text) from public, anon, authenticated;
grant execute on function public.beta_email_allowed(text) to service_role;

create or replace function public.enforce_beta_invite() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.beta_email_allowed(new.email) then
    raise exception 'beta_invite_only' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.enforce_beta_invite() from public, anon, authenticated;

create trigger enforce_beta_invite before insert on auth.users
  for each row execute function public.enforce_beta_invite();

-- Un changement d'adresse ne doit pas permettre de sortir de la liste d'invitation.
create trigger enforce_beta_invite_on_email_change before update of email on auth.users
  for each row when (new.email is distinct from old.email) execute function public.enforce_beta_invite();

-- Utilisation :
--   insert into public.beta_allowlist (email, note) values ('testeur.a@exemple.fr', 'Compte A');
--   update public.beta_settings set invite_only = false, updated_at = now();  -- ouverture publique, plus tard
