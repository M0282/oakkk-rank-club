import { predictionReward } from "../shared/prediction.js";
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

const rewardCases = [
  ["over", 60, 20],
  ["over", 40, 15],
  ["over", 20, 10],
  ["over", 0, 5],
  ["over", -60, 5],
  ["under", -60, 20],
  ["under", -40, 15],
  ["under", -20, 10],
  ["under", 0, 5],
  ["under", 60, 5]
];
for (const [direction, offset, expected] of rewardCases) {
  assert(
    predictionReward(direction, offset) === expected,
    `${direction} ${offset} 보상 계산이 올바르지 않습니다.`
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

console.log("오크크 랭크 클럽 핵심 로직 테스트 통과");
