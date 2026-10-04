-- =============================================================================
-- Livwith : schéma initial (Supabase, PostgreSQL 15+)
-- Sécurité portée par la base : RLS partout, écritures sensibles via RPC.
-- À exécuter une fois dans le SQL Editor de Supabase (ou `supabase db push`).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Référentiel des villes et seuils anti-fraude (heuristiques à calibrer)
-- ---------------------------------------------------------------------------
create table public.cities (
  slug text primary key check (slug ~ '^[a-z-]+$'),
  name text not null,
  room_floor int not null,    -- loyer charges comprises minimum plausible, chambre (€)
  entire_floor int not null,  -- idem, logement entier (€)
  eur_m2_floor int not null,  -- loyer hors charges minimum plausible au m², logement entier
  active boolean not null default true
);

insert into public.cities (slug, name, room_floor, entire_floor, eur_m2_floor) values
  ('paris', 'Paris', 400, 700, 20),
  ('lyon', 'Lyon', 280, 480, 10),
  ('marseille', 'Marseille', 250, 450, 9),
  ('toulouse', 'Toulouse', 250, 420, 9),
  ('bordeaux', 'Bordeaux', 280, 480, 10),
  ('lille', 'Lille', 250, 420, 9),
  ('nantes', 'Nantes', 250, 420, 9),
  ('montpellier', 'Montpellier', 250, 420, 9),
  ('rennes', 'Rennes', 250, 420, 9),
  ('strasbourg', 'Strasbourg', 250, 420, 9),
  ('grenoble', 'Grenoble', 230, 400, 8),
  ('nice', 'Nice', 300, 520, 11);

-- ---------------------------------------------------------------------------
-- 2. Fonctions de validation (pures)
-- ---------------------------------------------------------------------------
create or replace function public.lifestyle_dims() returns text[]
language sql immutable set search_path = '' as $$
  select array['cleanliness','schedule','quiet','social','guests','remote','smoking','pets','sharing','duration']
$$;

create or replace function public.lifestyle_max(p_dim text) returns int
language sql immutable set search_path = '' as $$
  select case p_dim
    when 'smoking' then 3
    when 'pets' then 4
    when 'cleanliness' then 5 when 'schedule' then 5 when 'quiet' then 5 when 'social' then 5
    when 'guests' then 5 when 'remote' then 5 when 'sharing' then 5 when 'duration' then 5
  end
$$;

create or replace function public.is_int_in(p jsonb, p_max int) returns boolean
language sql immutable set search_path = '' as $$
  select p is not null and jsonb_typeof(p) = 'number'
     and (p::text)::numeric = floor((p::text)::numeric)
     and (p::text)::numeric between 1 and p_max
$$;

create or replace function public.is_valid_lifestyle(p jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare d text;
begin
  if p is null or jsonb_typeof(p) <> 'object' then return false; end if;
  if (select count(*) from jsonb_object_keys(p)) <> 10 then return false; end if;
  foreach d in array public.lifestyle_dims() loop
    if not public.is_int_in(p -> d, public.lifestyle_max(d)) then return false; end if;
  end loop;
  return true;
end $$;

create or replace function public.is_valid_preferences(p jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare d text; pr jsonb; a jsonb; x jsonb;
begin
  if p is null or jsonb_typeof(p) <> 'object' then return false; end if;
  if (select count(*) from jsonb_object_keys(p)) <> 10 then return false; end if;
  foreach d in array public.lifestyle_dims() loop
    pr := p -> d;
    if pr is null or jsonb_typeof(pr) <> 'object' then return false; end if;
    a := pr -> 'accept';
    if a is null or jsonb_typeof(a) <> 'array' or jsonb_array_length(a) = 0
       or jsonb_array_length(a) > public.lifestyle_max(d) then return false; end if;
    for x in select value from jsonb_array_elements(a) loop
      if not public.is_int_in(x, public.lifestyle_max(d)) then return false; end if;
    end loop;
    if jsonb_typeof(pr -> 'importance') <> 'number'
       or (pr ->> 'importance')::numeric not in (0, 1, 2, 3) then return false; end if;
  end loop;
  return true;
end $$;

-- Chemins de fichiers : toujours dans le dossier de leur propriétaire.
create or replace function public.paths_owned(p_owner uuid, p_paths text[]) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(bool_and(x like (p_owner::text || '/%') and x !~ '\.\.' and char_length(x) <= 200), true)
  from unnest(p_paths) as x
$$;

-- Signaux d'arnaque classiques (paiement avant visite, propriétaire à l'étranger...).
create or replace function public.scam_signals(p_text text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(p_text, '') ~* (
    'western\s*union|moneygram|mandat\s*cash|transcash|neosurf|pcs\s*mastercard|carte\s*pr[ée]pay[ée]e|'
    || 'bitcoin|crypto|usdt|gift\s*card|wire\s*transfer|'
    || 'je\s+suis\s+(actuellement\s+)?([àa]\s+l.?[ée]tranger|en\s+mission\s+[àa]\s+l.?[ée]tranger)|'
    || 'envo(i|y)\w*\s+(des|les|vos|tes)\s+cl[ée]s|cl[ée]s\s+par\s+(la\s+)?poste|'
    || '(payer|paiement|virement|verse\w*)\s+(\w+\s+){0,3}avant\s+(la\s+|toute\s+)?visite|'
    || 'sans\s+visite|airbnb\s+(se\s+charge|garanti)'
  )
$$;

create or replace function public.imperatives_ok(p_prefs jsonb, p_other jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select not exists (
    select 1 from jsonb_each(coalesce(p_prefs, '{}'::jsonb)) as e(dim, pref)
    where (e.pref ->> 'importance')::int = 3
      and not coalesce((e.pref -> 'accept') @> (p_other -> e.dim), false)
  )
$$;

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;

-- ---------------------------------------------------------------------------
-- 3. Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 40),
  gender text check (gender in ('woman', 'man', 'nonbinary')),
  occupation text check (char_length(occupation) <= 60),
  bio text not null default '' check (char_length(bio) <= 600),
  city text not null references public.cities (slug),
  budget_min int not null check (budget_min between 100 and 5000),
  budget_max int not null check (budget_max between 100 and 5000),
  move_in_date date not null,
  intents text[] not null check (cardinality(intents) between 1 and 3 and intents <@ array['room','host','team']::text[]),
  photos text[] not null default '{}' check (cardinality(photos) <= 5),
  lifestyle jsonb not null default '{}'::jsonb,
  onboarded_at timestamptz,
  is_paused boolean not null default false,
  is_demo boolean not null default false,
  suspended_at timestamptz,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_range check (budget_min <= budget_max),
  constraint photos_owned check (public.paths_owned(id, photos)),
  constraint lifestyle_shape check (lifestyle = '{}'::jsonb or public.is_valid_lifestyle(lifestyle)),
  constraint onboarding_complete check (onboarded_at is null or public.is_valid_lifestyle(lifestyle))
);
create index profiles_pool_idx on public.profiles (city, last_active_at desc) where onboarded_at is not null and not is_paused and suspended_at is null;

create table public.profiles_private (
  id uuid primary key references public.profiles (id) on delete cascade,
  birth_date date not null check (birth_date > date '1920-01-01' and birth_date <= (current_date - interval '18 years')::date),
  preferences jsonb not null check (public.is_valid_preferences(preferences)),
  age_min int not null default 18 check (age_min between 18 and 99),
  age_max int not null default 99 check (age_max between 18 and 99),
  household_pref text not null default 'any' check (household_pref in ('any', 'women', 'men')),
  terms_accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint age_range check (age_min <= age_max)
);

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  kind text not null check (kind in ('room', 'entire')),
  title text not null check (char_length(btrim(title)) between 8 and 90),
  description text not null check (char_length(description) between 30 and 3000),
  city text not null references public.cities (slug),
  district text check (char_length(district) <= 60),
  rent int not null check (rent between 50 and 20000),
  charges int not null default 0 check (charges between 0 and 2000),
  total_monthly int generated always as (rent + charges) stored,
  deposit int check (deposit between 0 and 40000),
  surface_m2 int check (surface_m2 between 5 and 500),
  bedrooms int check (bedrooms between 1 and 12),
  flatmates int check (flatmates between 0 and 12),
  furnished boolean not null default true,
  available_from date not null,
  min_duration_months int check (min_duration_months between 1 and 36),
  amenities text[] not null default '{}' check (cardinality(amenities) <= 20 and amenities <@ array[
    'wifi','washing_machine','dishwasher','balcony','elevator','parking','bike_storage',
    'garden','air_conditioning','near_transit','private_bathroom','desk']::text[]),
  photos text[] not null default '{}' check (cardinality(photos) <= 8),
  status text not null default 'draft' check (status in ('draft','pending_review','published','filled','archived','removed')),
  review_reason text,
  moderation_hold boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listing_photos_owned check (public.paths_owned(owner_id, photos))
);
create index listings_search_idx on public.listings (city, status, total_monthly);
create index listings_owner_idx on public.listings (owner_id);

create table public.swipes (
  swiper uuid not null references public.profiles (id) on delete cascade,
  target uuid not null references public.profiles (id) on delete cascade,
  liked boolean not null,
  listing_id uuid references public.listings (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (swiper, target),
  check (swiper <> target)
);
create index swipes_target_idx on public.swipes (target) where liked;

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b)
);
create index matches_b_idx on public.matches (user_b);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 50),
  city text not null references public.cities (slug),
  budget_per_person int not null check (budget_per_person between 100 and 5000),
  target_size int not null default 3 check (target_size between 2 and 6),
  move_in_date date,
  description text not null default '' check (char_length(description) <= 500),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  status text not null default 'invited' check (status in ('invited', 'active', 'declined', 'left')),
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id);

create table public.group_listings (
  group_id uuid not null references public.groups (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  added_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (group_id, listing_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('direct', 'group')),
  match_id uuid unique references public.matches (id) on delete set null,
  group_id uuid unique references public.groups (id) on delete cascade,
  closed_at timestamptz,
  last_message_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index participants_user_idx on public.conversation_participants (user_id);

create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null default auth.uid(),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  flagged boolean not null default false,
  created_at timestamptz not null default now()
);
create index messages_conv_idx on public.messages (conversation_id, id desc);
create index messages_sender_idx on public.messages (sender_id, created_at desc);

create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table public.blocks (
  blocker uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  blocked uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
create index blocks_blocked_idx on public.blocks (blocked);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid references public.profiles (id) on delete set null default auth.uid(),
  target_user uuid references public.profiles (id) on delete cascade,
  target_listing uuid references public.listings (id) on delete cascade,
  target_message bigint references public.messages (id) on delete cascade,
  reason text not null check (reason in ('fake','scam','harassment','inappropriate','discrimination','underage','other')),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open','reviewing','actioned','dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolution_note text,
  constraint one_target check (num_nonnulls(target_user, target_listing, target_message) = 1)
);
create unique index reports_once_user on public.reports (reporter, target_user) where target_user is not null;
create unique index reports_once_listing on public.reports (reporter, target_listing) where target_listing is not null;
create unique index reports_once_message on public.reports (reporter, target_message) where target_message is not null;
create index reports_status_idx on public.reports (status, created_at desc);

create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger profiles_private_updated before update on public.profiles_private for each row execute function public.set_updated_at();
create trigger groups_updated before update on public.groups for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Fonctions d'aide à la sécurité (SECURITY DEFINER, chemin vide)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid())
$$;

create or replace function public.is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.blocks where (blocker = a and blocked = b) or (blocker = b and blocked = a))
$$;

create or replace function public.is_participant(p_conversation uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conversation_participants
                 where conversation_id = p_conversation and user_id = auth.uid())
$$;

create or replace function public.is_group_member(p_group uuid, p_include_invited boolean default false) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.group_members
                 where group_id = p_group and user_id = auth.uid()
                   and (status = 'active' or (p_include_invited and status = 'invited')))
$$;

create or replace function public.shares_space(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.matches m where m.user_a = least(a, b) and m.user_b = greatest(a, b))
      or exists (select 1 from public.conversation_participants p1
                 join public.conversation_participants p2 on p2.conversation_id = p1.conversation_id
                 where p1.user_id = a and p2.user_id = b)
      or exists (select 1 from public.group_members g1
                 join public.group_members g2 on g2.group_id = g1.group_id
                 where g1.user_id = a and g2.user_id = b
                   and g1.status in ('active','invited') and g2.status in ('active','invited'))
$$;

create or replace function public.is_active_user(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = p_user and suspended_at is null)
$$;

create or replace function public.is_reported_message(p_message bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.reports r where r.target_message = p_message)
$$;

create or replace function public.can_see_message(p_message bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.messages m
                 join public.conversation_participants cp on cp.conversation_id = m.conversation_id
                 where m.id = p_message and cp.user_id = auth.uid())
$$;

create or replace function public.can_post(p_conversation uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_participant(p_conversation)
     and exists (select 1 from public.conversations c where c.id = p_conversation and c.closed_at is null)
     and exists (select 1 from public.profiles p where p.id = auth.uid() and p.suspended_at is null)
$$;

-- Âge calculé, exposé comme colonne calculée (select 'age_years'), sans révéler la date de naissance.
create or replace function public.age_years(p public.profiles) returns int
language sql stable security definer set search_path = '' as $$
  select extract(year from age(current_date, pp.birth_date))::int
  from public.profiles_private pp where pp.id = p.id
$$;

-- ---------------------------------------------------------------------------
-- 5. Triggers métier
-- ---------------------------------------------------------------------------

-- Annonces : contrôles anti-fraude, limites, statuts réservés à la modération.
create or replace function public.listings_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_trusted boolean := public.is_admin() or auth.uid() is null;
  v_city public.cities;
  v_reason text;
  v_count int;
begin
  if not v_trusted then
    if tg_op = 'INSERT' then
      if new.owner_id <> auth.uid() then raise exception 'invalid_owner' using errcode = '42501'; end if;
      if not exists (select 1 from public.profiles where id = new.owner_id and onboarded_at is not null and suspended_at is null) then
        raise exception 'profile_incomplete' using errcode = '42501';
      end if;
      select count(*) into v_count from public.listings where owner_id = new.owner_id and created_at > now() - interval '24 hours';
      if v_count >= 5 then raise exception 'rate_limited' using errcode = '53400'; end if;
      if new.status not in ('draft', 'published') then raise exception 'invalid_status' using errcode = '42501'; end if;
      new.moderation_hold := false;
      new.review_reason := null;
    else
      if old.status = 'removed' then raise exception 'listing_removed' using errcode = '42501'; end if;
      if new.owner_id <> old.owner_id then raise exception 'invalid_owner' using errcode = '42501'; end if;
      if new.status = 'removed' then raise exception 'invalid_status' using errcode = '42501'; end if;
      if old.moderation_hold and not new.moderation_hold then raise exception 'invalid_status' using errcode = '42501'; end if;
    end if;

    if new.status in ('pending_review', 'published')
       and (tg_op = 'INSERT' or old.status not in ('pending_review', 'published')) then
      select count(*) into v_count from public.listings
        where owner_id = new.owner_id and status in ('pending_review', 'published') and id <> new.id;
      if v_count >= 3 then raise exception 'too_many_active_listings' using errcode = '53400'; end if;
    end if;

    if new.status = 'published' then
      if cardinality(new.photos) < 1 then raise exception 'photos_required' using errcode = '22023'; end if;
      select * into v_city from public.cities where slug = new.city;
      -- total_monthly (colonne générée) n'est pas encore calculé dans un trigger BEFORE.
      if new.kind = 'room' and new.rent + new.charges < v_city.room_floor then
        v_reason := 'Prix inhabituellement bas pour cette ville : vérification manuelle.';
      elsif new.kind = 'entire' and new.rent + new.charges < v_city.entire_floor then
        v_reason := 'Prix inhabituellement bas pour cette ville : vérification manuelle.';
      elsif new.kind = 'entire' and new.surface_m2 is not null and new.rent::numeric / new.surface_m2 < v_city.eur_m2_floor then
        v_reason := 'Loyer au m² inhabituellement bas : vérification manuelle.';
      elsif public.scam_signals(new.title || ' ' || new.description) then
        v_reason := 'Formulation souvent associée aux arnaques : vérification manuelle.';
      end if;
      if new.moderation_hold then
        v_reason := coalesce(v_reason, 'En cours de vérification par la modération.');
      end if;
      if v_reason is not null then
        new.status := 'pending_review';
        new.review_reason := v_reason;
      else
        new.review_reason := null;
      end if;
    end if;
  end if;

  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    new.published_at := now();
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger listings_guard before insert or update on public.listings
  for each row execute function public.listings_guard();

-- Messages : limites d'envoi et détection d'arnaque.
create or replace function public.messages_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_min int; v_day int;
begin
  if new.sender_id is not null and auth.uid() is not null then
    select count(*) filter (where created_at > now() - interval '1 minute'), count(*)
      into v_min, v_day
      from public.messages where sender_id = new.sender_id and created_at > now() - interval '24 hours';
    if v_min >= 20 or v_day >= 500 then raise exception 'rate_limited' using errcode = '53400'; end if;
  end if;
  new.body := btrim(new.body);
  new.flagged := public.scam_signals(new.body);
  new.created_at := now();
  return new;
end $$;
create trigger messages_before_insert before insert on public.messages
  for each row execute function public.messages_before_insert();

create or replace function public.messages_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  update public.conversation_participants set last_read_at = new.created_at
    where conversation_id = new.conversation_id and user_id = new.sender_id;
  return new;
end $$;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.messages_after_insert();

-- Blocage : supprime le match, ferme la conversation, annule les invitations croisées.
create or replace function public.blocks_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations c set closed_at = now()
    from public.matches m
    where c.match_id = m.id and m.user_a = least(new.blocker, new.blocked) and m.user_b = greatest(new.blocker, new.blocked);
  delete from public.matches where user_a = least(new.blocker, new.blocked) and user_b = greatest(new.blocker, new.blocked);
  update public.group_members set status = 'declined', responded_at = now()
    where status = 'invited'
      and ((user_id = new.blocked and invited_by = new.blocker) or (user_id = new.blocker and invited_by = new.blocked));
  return new;
end $$;
create trigger blocks_after_insert after insert on public.blocks
  for each row execute function public.blocks_after_insert();

-- Signalements : limite quotidienne, masquage d'une annonce après 3 signalants distincts.
create or replace function public.reports_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  if auth.uid() is not null then
    select count(*) into v_n from public.reports where reporter = auth.uid() and created_at > now() - interval '24 hours';
    if v_n >= 20 then raise exception 'rate_limited' using errcode = '53400'; end if;
  end if;
  new.status := 'open';
  new.resolved_at := null; new.resolved_by := null; new.resolution_note := null;
  return new;
end $$;
create trigger reports_before_insert before insert on public.reports
  for each row execute function public.reports_before_insert();

create or replace function public.reports_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  if new.target_listing is not null then
    select count(distinct reporter) into v_n from public.reports
      where target_listing = new.target_listing and status in ('open', 'reviewing');
    if v_n >= 3 then
      update public.listings
        set status = case when status = 'published' then 'pending_review' else status end,
            moderation_hold = true,
            review_reason = 'Masquée après plusieurs signalements, en attente de modération.'
        where id = new.target_listing;
    end if;
  end if;
  return new;
end $$;
create trigger reports_after_insert after insert on public.reports
  for each row execute function public.reports_after_insert();

-- ---------------------------------------------------------------------------
-- 6. RPC appelées par l'application
-- ---------------------------------------------------------------------------

-- Onboarding atomique : profil public + données privées (droits de l'utilisateur, RLS appliquée).
create or replace function public.save_onboarding(
  p_first_name text, p_gender text, p_occupation text, p_bio text, p_city text,
  p_budget_min int, p_budget_max int, p_move_in_date date, p_intents text[], p_photos text[],
  p_lifestyle jsonb, p_preferences jsonb, p_birth_date date, p_age_min int, p_age_max int,
  p_household_pref text, p_terms_accepted_at timestamptz
) returns void
language plpgsql security invoker set search_path = '' as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  insert into public.profiles as p (id, first_name, gender, occupation, bio, city, budget_min, budget_max,
                                    move_in_date, intents, photos, lifestyle, onboarded_at)
  values (v_me, btrim(p_first_name), p_gender, nullif(btrim(coalesce(p_occupation, '')), ''), coalesce(p_bio, ''),
          p_city, p_budget_min, p_budget_max, p_move_in_date, p_intents, coalesce(p_photos, '{}'), p_lifestyle, now())
  on conflict (id) do update set
    first_name = excluded.first_name, gender = excluded.gender, occupation = excluded.occupation,
    bio = excluded.bio, city = excluded.city, budget_min = excluded.budget_min, budget_max = excluded.budget_max,
    move_in_date = excluded.move_in_date, intents = excluded.intents, photos = excluded.photos,
    lifestyle = excluded.lifestyle, onboarded_at = coalesce(p.onboarded_at, now());
  insert into public.profiles_private as pp (id, birth_date, preferences, age_min, age_max, household_pref, terms_accepted_at)
  values (v_me, p_birth_date, p_preferences, coalesce(p_age_min, 18), coalesce(p_age_max, 99),
          coalesce(p_household_pref, 'any'), coalesce(p_terms_accepted_at, now()))
  on conflict (id) do update set
    preferences = excluded.preferences, age_min = excluded.age_min, age_max = excluded.age_max,
    household_pref = excluded.household_pref;
end $$;

-- Like / passer. Crée le match et la conversation si le like est réciproque.
create or replace function public.swipe(p_target uuid, p_liked boolean, p_listing uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_a uuid; v_b uuid;
  v_count int;
  v_match uuid; v_conv uuid;
  v_other record;
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_target is null or p_target = v_me or p_liked is null then raise exception 'invalid_target' using errcode = '22023'; end if;
  if not exists (select 1 from public.profiles where id = v_me and onboarded_at is not null and suspended_at is null) then
    raise exception 'profile_incomplete' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_target and onboarded_at is not null and suspended_at is null) then
    raise exception 'target_unavailable' using errcode = '22023';
  end if;
  if public.is_blocked_between(v_me, p_target) then raise exception 'blocked' using errcode = '42501'; end if;
  if p_listing is not null and not exists (
    select 1 from public.listings l
    where l.id = p_listing and l.status = 'published' and l.owner_id in (p_target, v_me)) then
    raise exception 'invalid_listing' using errcode = '22023';
  end if;

  v_a := least(v_me, p_target); v_b := greatest(v_me, p_target);
  -- Sérialise les deux personnes : deux likes simultanés créent bien un match.
  perform pg_advisory_xact_lock(hashtextextended(v_a::text || v_b::text, 0));

  select id into v_match from public.matches where user_a = v_a and user_b = v_b;
  if v_match is not null then
    select id into v_conv from public.conversations where match_id = v_match;
    return jsonb_build_object('matched', true, 'new', false, 'match_id', v_match, 'conversation_id', v_conv);
  end if;

  select count(*) into v_count from public.swipes where swiper = v_me and created_at > now() - interval '24 hours';
  if v_count >= 300 then raise exception 'rate_limited' using errcode = '53400'; end if;

  insert into public.swipes as s (swiper, target, liked, listing_id)
  values (v_me, p_target, p_liked, p_listing)
  on conflict (swiper, target) do update
    set liked = excluded.liked, listing_id = coalesce(excluded.listing_id, s.listing_id), created_at = now();

  if not p_liked then return jsonb_build_object('matched', false); end if;

  select liked, listing_id into v_other from public.swipes where swiper = p_target and target = v_me;
  if not coalesce(v_other.liked, false) then return jsonb_build_object('matched', false); end if;

  insert into public.matches (user_a, user_b, listing_id)
  values (v_a, v_b, coalesce(p_listing, v_other.listing_id))
  returning id into v_match;
  insert into public.conversations (kind, match_id) values ('direct', v_match) returning id into v_conv;
  insert into public.conversation_participants (conversation_id, user_id) values (v_conv, v_a), (v_conv, v_b);
  return jsonb_build_object('matched', true, 'new', true, 'match_id', v_match, 'conversation_id', v_conv);
end $$;

-- Groupes
create or replace function public.create_group(
  p_name text, p_city text, p_budget int, p_target_size int, p_move_in date, p_description text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid(); v_group uuid; v_conv uuid; v_n int;
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from public.profiles where id = v_me and onboarded_at is not null and suspended_at is null) then
    raise exception 'profile_incomplete' using errcode = '42501';
  end if;
  select count(*) into v_n from public.group_members where user_id = v_me and status = 'active';
  if v_n >= 5 then raise exception 'too_many_groups' using errcode = '53400'; end if;
  insert into public.groups (name, city, budget_per_person, target_size, move_in_date, description, created_by)
  values (btrim(p_name), p_city, p_budget, coalesce(p_target_size, 3), p_move_in, coalesce(p_description, ''), v_me)
  returning id into v_group;
  insert into public.group_members (group_id, user_id, role, status, invited_by, responded_at)
  values (v_group, v_me, 'owner', 'active', v_me, now());
  insert into public.conversations (kind, group_id) values ('group', v_group) returning id into v_conv;
  insert into public.conversation_participants (conversation_id, user_id) values (v_conv, v_me);
  return v_group;
end $$;

create or replace function public.invite_to_group(p_group uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid(); v_n int; v_status text;
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.is_group_member(p_group) then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.matches where user_a = least(v_me, p_user) and user_b = greatest(v_me, p_user)) then
    raise exception 'not_a_match' using errcode = '42501';
  end if;
  if public.is_blocked_between(v_me, p_user) or not public.is_active_user(p_user) then
    raise exception 'target_unavailable' using errcode = '22023';
  end if;
  perform 1 from public.groups where id = p_group for update;
  select status into v_status from public.group_members where group_id = p_group and user_id = p_user;
  if v_status in ('active', 'invited') then return; end if;
  select count(*) into v_n from public.group_members where group_id = p_group and status in ('active', 'invited');
  if v_n >= 6 then raise exception 'group_full' using errcode = '53400'; end if;
  insert into public.group_members (group_id, user_id, role, status, invited_by)
  values (p_group, p_user, 'member', 'invited', v_me)
  on conflict (group_id, user_id) do update set status = 'invited', invited_by = v_me, responded_at = null, created_at = now();
end $$;

create or replace function public.respond_group_invite(p_group uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid(); v_conv uuid;
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from public.group_members where group_id = p_group and user_id = v_me and status = 'invited') then
    raise exception 'no_invitation' using errcode = '22023';
  end if;
  update public.group_members set status = case when p_accept then 'active' else 'declined' end, responded_at = now()
    where group_id = p_group and user_id = v_me;
  if p_accept then
    select id into v_conv from public.conversations where group_id = p_group;
    insert into public.conversation_participants (conversation_id, user_id) values (v_conv, v_me) on conflict do nothing;
  end if;
end $$;

create or replace function public.leave_group(p_group uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid(); v_role text; v_next uuid;
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select role into v_role from public.group_members where group_id = p_group and user_id = v_me and status = 'active';
  if v_role is null then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.group_members set status = 'left', role = 'member', responded_at = now() where group_id = p_group and user_id = v_me;
  delete from public.conversation_participants cp using public.conversations c
    where c.id = cp.conversation_id and c.group_id = p_group and cp.user_id = v_me;
  if v_role = 'owner' then
    select user_id into v_next from public.group_members where group_id = p_group and status = 'active' order by responded_at limit 1;
    if v_next is null then
      delete from public.groups where id = p_group;
    else
      update public.group_members set role = 'owner' where group_id = p_group and user_id = v_next;
    end if;
  end if;
end $$;

-- Liste des conversations de l'utilisateur courant (filtrée sur auth.uid()).
create or replace function public.my_conversations()
returns table (
  conversation_id uuid, kind text, group_id uuid, title text, other_user_id uuid, other_photo text,
  other_is_demo boolean, last_message text, last_message_at timestamptz, last_sender uuid, unread int,
  closed boolean
)
language sql stable security definer set search_path = '' as $$
  select c.id, c.kind, c.group_id,
         case when c.kind = 'group' then g.name else coalesce(op.first_name, 'Compte supprimé') end,
         o.user_id, op.photos[1], coalesce(op.is_demo, false),
         lm.body, coalesce(lm.created_at, c.created_at), lm.sender_id,
         (select count(*)::int from public.messages m2
            where m2.conversation_id = c.id and m2.created_at > me.last_read_at
              and m2.sender_id is distinct from me.user_id),
         c.closed_at is not null
  from public.conversation_participants me
  join public.conversations c on c.id = me.conversation_id
  left join public.groups g on g.id = c.group_id
  left join lateral (select p.user_id from public.conversation_participants p
                     where p.conversation_id = c.id and p.user_id <> me.user_id limit 1) o on c.kind = 'direct'
  left join public.profiles op on op.id = o.user_id
  left join lateral (select m.body, m.created_at, m.sender_id from public.messages m
                     where m.conversation_id = c.id order by m.id desc limit 1) lm on true
  where me.user_id = auth.uid()
  order by coalesce(lm.created_at, c.created_at) desc
$$;

create or replace function public.touch_last_active() returns void
language sql security invoker set search_path = '' as $$
  update public.profiles set last_active_at = now()
  where id = auth.uid() and last_active_at < now() - interval '5 minutes'
$$;

-- Réservé au serveur (service role) : les préférences ne quittent jamais le serveur.
create or replace function public.discovery_pool(p_user uuid, p_limit int default 200)
returns table (
  id uuid, first_name text, gender text, occupation text, bio text, city text, budget_min int, budget_max int,
  move_in_date date, intents text[], photos text[], is_demo boolean, last_active_at timestamptz, age int,
  lifestyle jsonb, preferences jsonb
)
language sql stable security definer set search_path = '' as $$
  with base as (
    select p.id, p.first_name, p.gender, p.occupation, p.bio, p.city, p.budget_min, p.budget_max, p.move_in_date,
           p.intents, p.photos, p.is_demo, p.last_active_at, p.lifestyle, p.is_paused, p.onboarded_at, p.suspended_at,
           pp.preferences, pp.age_min, pp.age_max, pp.household_pref,
           extract(year from age(current_date, pp.birth_date))::int as yrs
    from public.profiles p join public.profiles_private pp on pp.id = p.id
    where p.onboarded_at is not null and p.suspended_at is null
  )
  select c.id, c.first_name, c.gender, c.occupation, c.bio, c.city, c.budget_min, c.budget_max, c.move_in_date,
         c.intents, c.photos, c.is_demo, c.last_active_at, c.yrs, c.lifestyle, c.preferences
  from base m join base c on c.id <> m.id
  where m.id = p_user
    and not c.is_paused
    and c.city = m.city
    and (('room' = any(m.intents) and 'host' = any(c.intents))
      or ('host' = any(m.intents) and 'room' = any(c.intents))
      or ('team' = any(m.intents) and 'team' = any(c.intents)))
    and c.budget_min <= m.budget_max and m.budget_min <= c.budget_max
    and abs(c.move_in_date - m.move_in_date) <= 60
    and c.yrs between m.age_min and m.age_max
    and m.yrs between c.age_min and c.age_max
    and (m.household_pref = 'any' or (m.household_pref = 'women' and c.gender = 'woman') or (m.household_pref = 'men' and c.gender = 'man'))
    and (c.household_pref = 'any' or (c.household_pref = 'women' and m.gender = 'woman') or (c.household_pref = 'men' and m.gender = 'man'))
    and not exists (select 1 from public.blocks b where (b.blocker = m.id and b.blocked = c.id) or (b.blocker = c.id and b.blocked = m.id))
    and not exists (select 1 from public.swipes s where s.swiper = m.id and s.target = c.id)
    and not exists (select 1 from public.swipes s where s.swiper = c.id and s.target = m.id and not s.liked)
    and not exists (select 1 from public.matches x where x.user_a = least(m.id, c.id) and x.user_b = greatest(m.id, c.id))
    and public.imperatives_ok(m.preferences, c.lifestyle)
    and public.imperatives_ok(c.preferences, m.lifestyle)
  order by c.is_demo, c.last_active_at desc
  limit greatest(1, least(coalesce(p_limit, 200), 500))
$$;

create or replace function public.compat_inputs(p_ids uuid[])
returns table (id uuid, lifestyle jsonb, preferences jsonb)
language sql stable security definer set search_path = '' as $$
  select p.id, p.lifestyle, pp.preferences
  from public.profiles p join public.profiles_private pp on pp.id = p.id
  where p.id = any(p_ids) and p.onboarded_at is not null
$$;

-- Modération
create or replace function public.admin_set_listing_status(p_listing uuid, p_status text, p_reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.listings
    set status = p_status, review_reason = p_reason, moderation_hold = p_status in ('pending_review', 'removed')
    where id = p_listing;
end $$;

create or replace function public.admin_suspend_user(p_user uuid, p_suspend boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.profiles set suspended_at = case when p_suspend then now() else null end where id = p_user;
  if p_suspend then
    update public.conversations c set closed_at = now()
      from public.matches m where c.match_id = m.id and p_user in (m.user_a, m.user_b) and c.closed_at is null;
  end if;
end $$;

create or replace function public.admin_resolve_report(p_report uuid, p_status text, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_status not in ('reviewing', 'actioned', 'dismissed') then raise exception 'invalid_status' using errcode = '22023'; end if;
  update public.reports
    set status = p_status, resolution_note = p_note,
        resolved_at = case when p_status = 'reviewing' then null else now() end,
        resolved_by = case when p_status = 'reviewing' then null else auth.uid() end
    where id = p_report;
end $$;

-- ---------------------------------------------------------------------------
-- 7. Droits : tout fermé par défaut, puis ouvert colonne par colonne
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon, public;
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from authenticated;
grant usage on schema public to authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all functions in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

grant select on all tables in schema public to authenticated;
revoke select on public.admins from authenticated;

grant insert (id, first_name, gender, occupation, bio, city, budget_min, budget_max, move_in_date, intents, photos, lifestyle, onboarded_at)
  on public.profiles to authenticated;
grant update (first_name, gender, occupation, bio, city, budget_min, budget_max, move_in_date, intents, photos, lifestyle,
              onboarded_at, is_paused, last_active_at)
  on public.profiles to authenticated;
grant insert (id, birth_date, preferences, age_min, age_max, household_pref, terms_accepted_at) on public.profiles_private to authenticated;
grant update (preferences, age_min, age_max, household_pref) on public.profiles_private to authenticated;
grant insert (kind, title, description, city, district, rent, charges, deposit, surface_m2, bedrooms, flatmates, furnished,
              available_from, min_duration_months, amenities, photos, status) on public.listings to authenticated;
grant update (kind, title, description, city, district, rent, charges, deposit, surface_m2, bedrooms, flatmates, furnished,
              available_from, min_duration_months, amenities, photos, status) on public.listings to authenticated;
grant delete on public.listings to authenticated;
grant update (name, budget_per_person, target_size, move_in_date, description) on public.groups to authenticated;
grant delete on public.groups to authenticated;
grant insert (group_id, listing_id) on public.group_listings to authenticated;
grant delete on public.group_listings to authenticated;
grant update (last_read_at) on public.conversation_participants to authenticated;
grant insert (conversation_id, body) on public.messages to authenticated;
grant insert (listing_id) on public.favorites to authenticated;
grant delete on public.favorites to authenticated;
grant insert (blocked) on public.blocks to authenticated;
grant delete on public.blocks to authenticated;
grant insert (target_user, target_listing, target_message, reason, details) on public.reports to authenticated;

grant execute on function public.age_years(public.profiles) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.save_onboarding(text, text, text, text, text, int, int, date, text[], text[], jsonb, jsonb, date, int, int, text, timestamptz) to authenticated;
grant execute on function public.swipe(uuid, boolean, uuid) to authenticated;
grant execute on function public.create_group(text, text, int, int, date, text) to authenticated;
grant execute on function public.invite_to_group(uuid, uuid) to authenticated;
grant execute on function public.respond_group_invite(uuid, boolean) to authenticated;
grant execute on function public.leave_group(uuid) to authenticated;
grant execute on function public.my_conversations() to authenticated;
grant execute on function public.touch_last_active() to authenticated;
grant execute on function public.admin_set_listing_status(uuid, text, text) to authenticated;
grant execute on function public.admin_suspend_user(uuid, boolean) to authenticated;
grant execute on function public.admin_resolve_report(uuid, text, text) to authenticated;
-- Fonctions utilisées par les politiques RLS : exécutables par les utilisateurs connectés.
grant execute on function public.is_blocked_between(uuid, uuid), public.is_participant(uuid),
  public.is_group_member(uuid, boolean), public.shares_space(uuid, uuid), public.is_active_user(uuid),
  public.can_post(uuid), public.is_reported_message(bigint), public.can_see_message(bigint), public.paths_owned(uuid, text[]), public.is_valid_lifestyle(jsonb),
  public.is_valid_preferences(jsonb), public.lifestyle_dims(), public.lifestyle_max(text),
  public.is_int_in(jsonb, int), public.scam_signals(text), public.imperatives_ok(jsonb, jsonb)
  to authenticated;
-- discovery_pool et compat_inputs : service_role uniquement.
revoke all on function public.discovery_pool(uuid, int), public.compat_inputs(uuid[]) from authenticated;

-- ---------------------------------------------------------------------------
-- 8. Row Level Security
-- ---------------------------------------------------------------------------
alter table public.cities enable row level security;
alter table public.profiles enable row level security;
alter table public.profiles_private enable row level security;
alter table public.admins enable row level security;
alter table public.listings enable row level security;
alter table public.swipes enable row level security;
alter table public.matches enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_listings enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.favorites enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

create policy cities_read on public.cities for select to authenticated using (true);

create policy profiles_read on public.profiles for select to authenticated using (
  id = (select auth.uid())
  or public.is_admin()
  or (suspended_at is null
      and not public.is_blocked_between((select auth.uid()), id)
      and ((onboarded_at is not null and not is_paused) or public.shares_space((select auth.uid()), id)))
);
create policy profiles_insert on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy private_read on public.profiles_private for select to authenticated using (id = (select auth.uid()));
create policy private_insert on public.profiles_private for insert to authenticated with check (id = (select auth.uid()));
create policy private_update on public.profiles_private for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy listings_read on public.listings for select to authenticated using (
  owner_id = (select auth.uid())
  or public.is_admin()
  or (status in ('published', 'filled')
      and public.is_active_user(owner_id)
      and not public.is_blocked_between((select auth.uid()), owner_id))
);
create policy listings_insert on public.listings for insert to authenticated with check (owner_id = (select auth.uid()));
create policy listings_update on public.listings for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy listings_delete on public.listings for delete to authenticated using (owner_id = (select auth.uid()));

-- Swipes : écriture via la RPC swipe() uniquement. Lecture : les siens, et les demandes reçues sur ses annonces.
create policy swipes_read on public.swipes for select to authenticated using (
  swiper = (select auth.uid()) or (target = (select auth.uid()) and liked and listing_id is not null)
);

create policy matches_read on public.matches for select to authenticated using (
  (select auth.uid()) in (user_a, user_b)
);

create policy groups_read on public.groups for select to authenticated using (public.is_group_member(id, true));
create policy groups_update on public.groups for update to authenticated using (
  exists (select 1 from public.group_members gm where gm.group_id = groups.id and gm.user_id = (select auth.uid()) and gm.role = 'owner' and gm.status = 'active')
);
create policy groups_delete on public.groups for delete to authenticated using (
  exists (select 1 from public.group_members gm where gm.group_id = groups.id and gm.user_id = (select auth.uid()) and gm.role = 'owner' and gm.status = 'active')
);

create policy group_members_read on public.group_members for select to authenticated using (public.is_group_member(group_id, true));

create policy group_listings_read on public.group_listings for select to authenticated using (public.is_group_member(group_id));
create policy group_listings_insert on public.group_listings for insert to authenticated with check (
  public.is_group_member(group_id)
  and exists (select 1 from public.listings l where l.id = listing_id and l.status = 'published')
);
create policy group_listings_delete on public.group_listings for delete to authenticated using (public.is_group_member(group_id));

create policy conversations_read on public.conversations for select to authenticated using (public.is_participant(id));

create policy participants_read on public.conversation_participants for select to authenticated using (public.is_participant(conversation_id));
create policy participants_update on public.conversation_participants for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy messages_read on public.messages for select to authenticated using (public.is_participant(conversation_id));
create policy messages_admin_read on public.messages for select to authenticated using (
  public.is_admin() and public.is_reported_message(id)
);
create policy messages_insert on public.messages for insert to authenticated with check (
  sender_id = (select auth.uid()) and public.can_post(conversation_id)
);

create policy favorites_read on public.favorites for select to authenticated using (user_id = (select auth.uid()));
create policy favorites_insert on public.favorites for insert to authenticated with check (user_id = (select auth.uid()));
create policy favorites_delete on public.favorites for delete to authenticated using (user_id = (select auth.uid()));

create policy blocks_read on public.blocks for select to authenticated using (blocker = (select auth.uid()));
create policy blocks_insert on public.blocks for insert to authenticated with check (blocker = (select auth.uid()));
create policy blocks_delete on public.blocks for delete to authenticated using (blocker = (select auth.uid()));

create policy reports_read on public.reports for select to authenticated using (reporter = (select auth.uid()) or public.is_admin());
create policy reports_insert on public.reports for insert to authenticated with check (
  reporter = (select auth.uid())
  and (target_message is null or public.can_see_message(target_message))
);

-- ---------------------------------------------------------------------------
-- 9. Temps réel (messages, accusés de lecture)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;
alter publication supabase_realtime add table public.messages, public.conversation_participants;

-- ---------------------------------------------------------------------------
-- 10. Stockage des photos : buckets privés, chacun écrit dans son dossier
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('listing-photos', 'listing-photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy livwith_photos_insert on storage.objects for insert to authenticated with check (
  bucket_id in ('avatars', 'listing-photos') and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy livwith_photos_select on storage.objects for select to authenticated using (
  bucket_id in ('avatars', 'listing-photos') and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy livwith_photos_update on storage.objects for update to authenticated
  using (bucket_id in ('avatars', 'listing-photos') and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id in ('avatars', 'listing-photos') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy livwith_photos_delete on storage.objects for delete to authenticated using (
  bucket_id in ('avatars', 'listing-photos') and (storage.foldername(name))[1] = (select auth.uid())::text
);
