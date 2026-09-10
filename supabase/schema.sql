-- Pickr temporary-room schema for Supabase.
-- Run this in the Supabase SQL editor, then enable Realtime for the tables below.
-- No service-role key belongs in this frontend project.

create extension if not exists pgcrypto;

create table if not exists public.lobbies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-HJ-KM-NP-Z2-9]{6}$'),
  status text not null default 'open' check (status in ('open', 'closed')),
  is_locked boolean not null default false,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

alter table public.lobbies
  add column if not exists state jsonb not null default '{}'::jsonb;

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 20),
  ideas jsonb not null default '[]'::jsonb check (jsonb_typeof(ideas) = 'array'),
  is_host boolean not null default false,
  is_ready boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists participants_unique_nickname_per_lobby
  on public.participants (lobby_id, lower(nickname));

create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  category text not null default 'Custom',
  mode text not null check (mode in ('swipe', 'blind', 'wheel', 'battle', 'whoPays')),
  status text not null default 'setup' check (status in ('setup', 'voting', 'tie', 'completed', 'cancelled')),
  winner_option_id uuid,
  winner_participant_id uuid,
  result jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.options (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  created_by uuid references public.participants(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.rounds
  drop constraint if exists rounds_winner_option_fk;

alter table public.rounds
  add constraint rounds_winner_option_fk
  foreign key (winner_option_id) references public.options(id) on delete set null;

alter table public.rounds
  drop constraint if exists rounds_winner_participant_fk;

alter table public.rounds
  add constraint rounds_winner_participant_fk
  foreign key (winner_participant_id) references public.participants(id) on delete set null;

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  option_id uuid references public.options(id) on delete cascade,
  vote text not null check (vote in ('yes', 'no', 'pick', 'veto')),
  created_at timestamptz not null default now()
);

create unique index if not exists votes_unique_swipe_vote
  on public.votes (round_id, participant_id, option_id)
  where option_id is not null;

alter table public.lobbies enable row level security;
alter table public.participants enable row level security;
alter table public.rounds enable row level security;
alter table public.options enable row level security;
alter table public.votes enable row level security;

-- Prototype RLS: rows are temporary, non-sensitive, and expire quickly.
-- A production build can add per-room secrets before relaxing host-only updates.
create policy "temporary lobby read" on public.lobbies
  for select using (expires_at > now());

create policy "temporary lobby insert" on public.lobbies
  for insert with check (expires_at <= now() + interval '24 hours');

create policy "temporary lobby update" on public.lobbies
  for update using (expires_at > now()) with check (expires_at > now());

create policy "temporary participant read" on public.participants
  for select using (
    exists (
      select 1 from public.lobbies
      where lobbies.id = participants.lobby_id
      and lobbies.expires_at > now()
    )
  );

create policy "temporary participant write" on public.participants
  for all using (
    exists (
      select 1 from public.lobbies
      where lobbies.id = participants.lobby_id
      and lobbies.expires_at > now()
    )
  ) with check (
    exists (
      select 1 from public.lobbies
      where lobbies.id = participants.lobby_id
      and lobbies.expires_at > now()
    )
  );

create policy "temporary rounds write" on public.rounds
  for all using (
    exists (
      select 1 from public.lobbies
      where lobbies.id = rounds.lobby_id
      and lobbies.expires_at > now()
    )
  ) with check (
    exists (
      select 1 from public.lobbies
      where lobbies.id = rounds.lobby_id
      and lobbies.expires_at > now()
    )
  );

create policy "temporary options write" on public.options
  for all using (
    exists (
      select 1
      from public.rounds
      join public.lobbies on lobbies.id = rounds.lobby_id
      where rounds.id = options.round_id
      and lobbies.expires_at > now()
    )
  ) with check (
    exists (
      select 1
      from public.rounds
      join public.lobbies on lobbies.id = rounds.lobby_id
      where rounds.id = options.round_id
      and lobbies.expires_at > now()
    )
  );

create policy "temporary votes write" on public.votes
  for all using (
    exists (
      select 1
      from public.rounds
      join public.lobbies on lobbies.id = rounds.lobby_id
      where rounds.id = votes.round_id
      and lobbies.expires_at > now()
    )
  ) with check (
    exists (
      select 1
      from public.rounds
      join public.lobbies on lobbies.id = rounds.lobby_id
      where rounds.id = votes.round_id
      and lobbies.expires_at > now()
    )
  );

create or replace function public.delete_expired_lobbies()
returns void
language sql
security definer
as $$
  delete from public.lobbies
  where expires_at <= now()
  or status = 'closed';
$$;
