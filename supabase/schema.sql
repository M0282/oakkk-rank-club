-- 오크크 랭크 클럽 전체 초기 스키마
-- 새 Supabase 프로젝트에서 Dashboard > SQL Editor로 전체 실행하세요.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  nickname text not null unique check (char_length(nickname) between 2 and 16),
  pin_hash text not null,
  oakkk integer not null default 50 check (oakkk >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  game_name text not null,
  tag_line text not null,
  riot_id_normalized text not null unique,
  puuid text unique,
  profile_icon_id integer,
  summoner_level integer,
  tier text,
  division text,
  lp integer,
  wins integer,
  losses integer,
  rank_score integer,
  recent_matches jsonb not null default '[]'::jsonb,
  current_win_streak integer not null default 0,
  current_loss_streak integer not null default 0,
  last_game_at timestamptz,
  last_error text,
  added_by uuid references public.users(id) on delete set null,
  added_at timestamptz not null default now(),
  updated_at timestamptz,
  is_active boolean not null default true
);

create table if not exists public.matches (
  match_id text primary key,
  queue_id integer not null,
  game_duration integer not null default 0,
  game_started_at timestamptz,
  game_ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.match_participants (
  id bigint generated always as identity primary key,
  match_id text not null references public.matches(match_id) on delete cascade,
  puuid text not null,
  team_id integer not null,
  win boolean not null,
  champion_name text,
  champion_id integer,
  kills integer not null default 0,
  deaths integer not null default 0,
  assists integer not null default 0,
  cs integer not null default 0,
  queue_id integer not null,
  played_at timestamptz,
  created_at timestamptz not null default now(),
  unique (match_id, puuid)
);

create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 100),
  created_at timestamptz not null default now(),
  is_deleted boolean not null default false
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  prediction_day date not null,
  direction text not null check (direction in ('over', 'under')),
  base_score integer not null check (base_score between 0 and 5000),
  score_delta integer not null default 0 check (score_delta in (-60, -40, -20, 0, 20, 40, 60)),
  potential_reward integer not null default 10
    check (potential_reward between 0 and 100),
  target_score integer not null check (target_score between 0 and 5000),
  target_label text not null,
  resolves_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'won', 'lost', 'void')),
  reward integer not null default 0 check (reward >= 0),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (user_id, prediction_day)
);

create index if not exists players_active_updated_idx
  on public.players (is_active, updated_at);
create index if not exists matches_queue_ended_idx
  on public.matches (queue_id, game_ended_at desc);
create index if not exists match_participants_match_idx
  on public.match_participants (match_id);
create index if not exists match_participants_puuid_played_idx
  on public.match_participants (puuid, played_at desc);
create index if not exists match_participants_team_idx
  on public.match_participants (match_id, team_id);
create index if not exists chat_created_idx
  on public.chat_messages (created_at desc);
create index if not exists predictions_due_idx
  on public.predictions (status, resolves_at);

alter table public.users enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_participants enable row level security;
alter table public.chat_messages enable row level security;
alter table public.predictions enable row level security;

-- 브라우저는 Supabase에 직접 접근하지 않고 Vercel 서버 함수만 사용합니다.
-- 따라서 anon/authenticated용 공개 정책은 만들지 않습니다.

create or replace function public.resolve_prediction(
  p_prediction_id uuid,
  p_current_score integer
)
returns table(result_status text, result_reward integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.predictions%rowtype;
  correct boolean;
  awarded integer;
begin
  select *
    into target
    from public.predictions
   where id = p_prediction_id
   for update;

  if not found then
    raise exception 'Prediction not found';
  end if;

  if target.status <> 'pending' or target.resolves_at > now() then
    return query select target.status, target.reward;
    return;
  end if;

  correct := case
    when target.direction = 'over'
      then p_current_score >= target.target_score
    else p_current_score < target.target_score
  end;

  awarded := case when correct then target.potential_reward else 0 end;

  update public.predictions
     set status = case when correct then 'won' else 'lost' end,
         reward = awarded,
         resolved_at = now()
   where id = target.id;

  if awarded > 0 then
    update public.users
       set oakkk = oakkk + awarded
     where id = target.user_id;
  end if;

  return query
    select case when correct then 'won' else 'lost' end, awarded;
end;
$$;

revoke all on function public.resolve_prediction(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.resolve_prediction(uuid, integer)
  to service_role;

insert into public.players (game_name, tag_line, riot_id_normalized)
values
  ('아샷추만마셔요', 'kr1', lower('아샷추만마셔요#kr1')),
  ('레전드팀운의주인', 'kr1', lower('레전드팀운의주인#kr1'))
on conflict (riot_id_normalized) do nothing;
