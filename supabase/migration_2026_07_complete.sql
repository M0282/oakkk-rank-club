-- 기존 오크크 랭크 클럽 Supabase에 1회 실행하는 확장 마이그레이션
-- 기능: 최근 20경기 캐시, 같은 팀 통계, 난이도별 무료 예측 보상
-- score_delta를 사용하여 PostgreSQL 예약어 OFFSET과 충돌하지 않게 구성했습니다.

-- 이전 수정 시도에서 "offset" 컬럼이 생성된 경우에도 안전하게 이름을 바꿉니다.
do $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'predictions'
       and column_name = 'offset'
  ) and not exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'predictions'
       and column_name = 'score_delta'
  ) then
    execute 'alter table public.predictions rename column "offset" to score_delta';
  end if;
end;
$$;

alter table public.predictions
  add column if not exists base_score integer,
  add column if not exists score_delta integer not null default 0,
  add column if not exists potential_reward integer not null default 10;

update public.predictions
   set base_score = target_score
 where base_score is null;

alter table public.predictions
  alter column base_score set not null,
  alter column score_delta set default 0,
  alter column potential_reward set default 10;

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

create index if not exists matches_queue_ended_idx
  on public.matches (queue_id, game_ended_at desc);
create index if not exists match_participants_match_idx
  on public.match_participants (match_id);
create index if not exists match_participants_puuid_played_idx
  on public.match_participants (puuid, played_at desc);
create index if not exists match_participants_team_idx
  on public.match_participants (match_id, team_id);

alter table public.matches enable row level security;
alter table public.match_participants enable row level security;

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

-- 제약조건은 여러 번 실행해도 중복되지 않게 추가합니다.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'predictions_base_score_range_chk'
       and conrelid = 'public.predictions'::regclass
  ) then
    alter table public.predictions
      add constraint predictions_base_score_range_chk
      check (base_score between 0 and 5000);
  end if;

  alter table public.predictions
    drop constraint if exists predictions_offset_allowed_chk;

  if not exists (
    select 1 from pg_constraint
     where conname = 'predictions_score_delta_allowed_chk'
       and conrelid = 'public.predictions'::regclass
  ) then
    alter table public.predictions
      add constraint predictions_score_delta_allowed_chk
      check (score_delta in (-60, -40, -20, 0, 20, 40, 60));
  end if;

  if not exists (
    select 1 from pg_constraint
     where conname = 'predictions_potential_reward_range_chk'
       and conrelid = 'public.predictions'::regclass
  ) then
    alter table public.predictions
      add constraint predictions_potential_reward_range_chk
      check (potential_reward between 0 and 100);
  end if;
end;
$$;
