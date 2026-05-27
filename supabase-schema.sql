create table if not exists public.rooms (
  id text primary key,
  name text not null,
  pin text not null unique,
  owner_nickname text not null default '',
  status text not null default 'waiting',
  rows integer not null default 5,
  cols integer not null default 5,
  win_condition text not null default 'line',
  topics jsonb not null default '[]'::jsonb,
  difficulty text not null default 'medio',
  current_challenge jsonb,
  game_challenges jsonb not null default '[]'::jsonb,
  drawn_answers jsonb not null default '[]'::jsonb,
  winner_id text,
  created_at timestamptz not null default now(),
  challenge_ended boolean not null default false,
  first_correct_player text,
  players_responded jsonb not null default '[]'::jsonb,
  timer_paused boolean not null default false
);

create table if not exists public.players (
  id text primary key,
  room_id text not null references public.rooms(id) on delete cascade,
  nickname text not null,
  card jsonb not null default '[]'::jsonb,
  marked jsonb not null default '[]'::jsonb,
  has_won boolean not null default false,
  correct_answers_count integer not null default 0,
  joined_at timestamptz not null default now()
);

create unique index if not exists players_room_nickname_unique
  on public.players (room_id, lower(nickname));

alter table public.rooms enable row level security;
alter table public.players enable row level security;

drop policy if exists "rooms public read" on public.rooms;
drop policy if exists "rooms public insert" on public.rooms;
drop policy if exists "rooms public update" on public.rooms;
drop policy if exists "rooms public delete" on public.rooms;
drop policy if exists "players public read" on public.players;
drop policy if exists "players public insert" on public.players;
drop policy if exists "players public update" on public.players;
drop policy if exists "players public delete" on public.players;

create policy "rooms public read"
  on public.rooms for select
  using (true);

create policy "rooms public insert"
  on public.rooms for insert
  with check (true);

create policy "rooms public update"
  on public.rooms for update
  using (true)
  with check (true);

create policy "rooms public delete"
  on public.rooms for delete
  using (true);

create policy "players public read"
  on public.players for select
  using (true);

create policy "players public insert"
  on public.players for insert
  with check (true);

create policy "players public update"
  on public.players for update
  using (true)
  with check (true);

create policy "players public delete"
  on public.players for delete
  using (true);
