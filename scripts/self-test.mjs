import {
  ALLOWED_SCORE_DELTAS,
  PREDICTION_DURATION_HOURS,
  predictionReward
} from "../shared/prediction.js";
import { buildDuoStatsFromParticipantRows } from "../lib/server/dashboard.js";
import {
  matchSummaryFromCache,
  normalizeMatchForCache
} from "../lib/server/riot.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const players = [
  { id: "a", puuid: "pa", game_name: "A", tag_line: "KR1" },
  { id: "b", puuid: "pb", game_name: "B", tag_line: "KR1" },
  { id: "c", puuid: "pc", game_name: "C", tag_line: "KR1" }
];

const participantRows = [
  {
    match_id: "m1",
    puuid: "pa",
    team_id: 100,
    win: true,
    queue_id: 420,
    played_at: "2026-07-01T00:00:00Z"
  },
  {
    match_id: "m1",
    puuid: "pb",
    team_id: 100,
    win: true,
    queue_id: 420,
    played_at: "2026-07-01T00:00:00Z"
  },
  {
    match_id: "m1",
    puuid: "pc",
    team_id: 200,
    win: false,
    queue_id: 420,
    played_at: "2026-07-01T00:00:00Z"
  },
  {
    match_id: "m2",
    puuid: "pa",
    team_id: 100,
    win: false,
    queue_id: 420,
    played_at: "2026-07-02T00:00:00Z"
  },
  {
    match_id: "m2",
    puuid: "pb",
    team_id: 100,
    win: false,
    queue_id: 420,
    played_at: "2026-07-02T00:00:00Z"
  },
  {
    match_id: "m3",
    puuid: "pa",
    team_id: 100,
    win: true,
    queue_id: 440,
    played_at: "2026-07-03T00:00:00Z"
  },
  {
    match_id: "m3",
    puuid: "pc",
    team_id: 100,
    win: true,
    queue_id: 440,
    played_at: "2026-07-03T00:00:00Z"
  }
];

const duoStats = buildDuoStatsFromParticipantRows(players, participantRows);
assert(duoStats.length === 1, "솔로랭크가 아닌 경기가 듀오 통계에 포함되었습니다.");
assert(duoStats[0].games === 2, "같은 팀 경기 수 계산이 올바르지 않습니다.");
assert(duoStats[0].wins === 1, "같은 팀 승리 수 계산이 올바르지 않습니다.");
assert(duoStats[0].winRate === 50, "같은 팀 승률 계산이 올바르지 않습니다.");

assert(PREDICTION_DURATION_HOURS === 8, "예측 판정 시간이 8시간이 아닙니다.");

assert(
  JSON.stringify(ALLOWED_SCORE_DELTAS) === JSON.stringify([-60, -40, -20, 0, 20, 40, 60]),
  "점수 변동폭 목록이 올바르지 않습니다."
);

const rewardCases = [
  [-60, 20],
  [-40, 15],
  [-20, 10],
  [0, 5],
  [20, 10],
  [40, 15],
  [60, 20]
];
for (const [scoreDelta, expected] of rewardCases) {
  assert(
    predictionReward(scoreDelta) === expected,
    `${scoreDelta} 보상 계산이 올바르지 않습니다.`
  );
}

const matchParticipants = Array.from({ length: 10 }, (_, index) => ({
  puuid: `p${index}`,
  teamId: index < 5 ? 100 : 200,
  win: index < 5,
  championName: `Champion${index}`,
  championId: index + 1,
  kills: index,
  deaths: 1,
  assists: 2,
  totalMinionsKilled: 100,
  neutralMinionsKilled: 10
}));

const normalized = normalizeMatchForCache("KR_1", {
  info: {
    queueId: 420,
    gameDuration: 1800,
    gameStartTimestamp: 1_000_000,
    gameEndTimestamp: 2_800_000,
    participants: matchParticipants
  }
});
const summary = matchSummaryFromCache("KR_1", normalized, "p1");
assert(normalized.participants.length === 10, "참가자 캐시 변환이 올바르지 않습니다.");
assert(summary?.win === true, "개인 승패 변환이 올바르지 않습니다.");
assert(summary?.teamId === 100, "팀 ID 변환이 올바르지 않습니다.");
assert(summary?.cs === 110, "CS 변환이 올바르지 않습니다.");

assert(predictionReward(30) === 0, "허용되지 않은 변동폭에 보상이 지급됩니다.");

console.log("오크크 랭크 클럽 핵심 로직 테스트 통과");
