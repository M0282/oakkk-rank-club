-- 오크크 랭크 클럽 기존 Supabase 프로젝트용 통합 마이그레이션
-- 한 번만 실행해도 되고, 실수로 다시 실행해도 기존 데이터를 삭제하지 않습니다.
-- 포함 기능: 최근 20경기 캐시, 같은 팀 승률, 8시간 예측, score_delta 절대값 보상

begin;

-- 1) 예측 테이블 확장
alter table public.predictions
  add column if not exists base_score integer,
  add column if not exists score_delta integer,
  add column if not exists potential_reward integer;

update public.predictions
   set base_score = greatest(0, least(5000, coalesce(base_score, target_score))),
       score_delta = case
         when score_delta in (-60, -40, -20, 0, 20, 40, 60) then score_delta
         else 0
       end,
       potential_reward = case abs(
         case
           when score_delta in (-60, -40, -20, 0, 20, 40, 60) then score_delta
           else 0
         end
       )
         when 60 then 20
         when 40 then 15
         when 20 then 10
         else 5
       end;

alter table public.predictions
  alter column base_score set default 0,
  alter column base_score set not null,
  alter column score_delta set default 0,
  alter column score_delta set not null,
  alter column potential_reward set default 5,
  alter column potential_reward set not null;

-- 기존에 대기 중인 예측은 생성 시각 기준 8시간으로 단축합니다.
update public.predictions
   set resolves_at = created_at + interval '8 hours'
 where status = 'pending'
   and resolves_at > created_at + interval '8 hours';

-- 2) 경기 캐시 테이블
create table if not exists public.matches (
  match_id text primary key,
  queue_id integer not null,
  game_duration integer not null default 0,
  game_started_at timestamptz,
  game_ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.matches
  add column if not exists queue_id integer,
  add column if not exists game_duration integer not null default 0,
  add column if not exists game_started_at timestamptz,
  add column if not exists game_ended_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

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

alter table public.match_participants
  add column if not exists puuid text,
  add column if not exists team_id integer,
  add column if not exists win boolean,
  add column if not exists champion_name text,
  add column if not exists champion_id integer,
  add column if not exists kills integer not null default 0,
  add column if not exists deaths integer not null default 0,
  add column if not exists assists integer not null default 0,
  add column if not exists cs integer not null default 0,
  add column if not exists queue_id integer,
  add column if not exists played_at timestamptz,
  add column if not exists created_at timestamptz not null default now();

-- 3) 인덱스와 제약조건
create index if not exists matches_queue_ended_idx
  on public.matches (queue_id, game_ended_at desc);
create index if not exists match_participants_match_idx
  on public.match_participants (match_id);
create index if not exists match_participants_puuid_played_idx
  on public.match_participants (puuid, played_at desc);
create index if not exists match_participants_team_idx
  on public.match_participants (match_id, team_id);

alter table public.predictions
  drop constraint if exists predictions_base_score_range_chk,
  drop constraint if exists predictions_score_delta_allowed_chk,
  drop constraint if exists predictions_potential_reward_range_chk;

alter table public.predictions
  add constraint predictions_base_score_range_chk
    check (base_score between 0 and 5000),
  add constraint predictions_score_delta_allowed_chk
    check (score_delta in (-60, -40, -20, 0, 20, 40, 60)),
  add constraint predictions_potential_reward_range_chk
    check (potential_reward in (5, 10, 15, 20));

alter table public.matches enable row level security;
alter table public.match_participants enable row level security;

-- 4) 예측 판정 함수: 참가/오답 차감 없음, 정답 시 저장된 보상만 지급
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
    when target.direction = 'over' then p_current_score >= target.target_score
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

commit;
