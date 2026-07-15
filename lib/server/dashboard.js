import { getSupabase } from "./supabase.js";
import { refreshPlayer, refreshPlayers, riotSettings } from "./riot.js";

const STALE_MS = 5 * 60 * 1000;
const DUO_MIN_GAMES_FOR_HIGHLIGHT = 2;

function playerUpdatedAt(player) {
  const value = player?.updated_at ? new Date(player.updated_at).getTime() : 0;
  return Number.isFinite(value) ? value : 0;
}

function isStale(player) {
  return Date.now() - playerUpdatedAt(player) > STALE_MS;
}

function pairKey(a, b) {
  return [a, b].sort().join("::");
}

function emptyPair(playerA, playerB) {
  return {
    playerA: {
      id: playerA.id,
      game_name: playerA.game_name,
      tag_line: playerA.tag_line
    },
    playerB: {
      id: playerB.id,
      game_name: playerB.game_name,
      tag_line: playerB.tag_line
    },
    games: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    lastPlayedAt: null,
    matchIds: new Set()
  };
}

function finalizeDuoStats(stats) {
  return [...stats.values()]
    .map((item) => ({
      playerA: item.playerA,
      playerB: item.playerB,
      games: item.games,
      wins: item.wins,
      losses: item.losses,
      winRate: item.games
        ? Number(((item.wins / item.games) * 100).toFixed(1))
        : 0,
      lastPlayedAt: item.lastPlayedAt
    }))
    .filter((item) => item.games > 0)
    .sort(
      (a, b) =>
        b.winRate - a.winRate ||
        b.games - a.games ||
        `${a.playerA.game_name}${a.playerB.game_name}`.localeCompare(
          `${b.playerA.game_name}${b.playerB.game_name}`,
          "ko"
        )
    );
}

export function buildDuoStatsFromRecentMatches(players) {
  const stats = new Map();
  const playerByPuuid = new Map(
    players.filter((player) => player.puuid).map((player) => [player.puuid, player])
  );

  for (const player of players) {
    for (const match of Array.isArray(player.recent_matches)
      ? player.recent_matches
      : []) {
      if (Number(match.queueId || 420) !== 420) continue;
      for (const teammatePuuid of Array.isArray(match.teammatePuuids)
        ? match.teammatePuuids
        : []) {
        const teammate = playerByPuuid.get(teammatePuuid);
        if (!teammate || teammate.id === player.id) continue;

        const key = pairKey(player.id, teammate.id);
        let item = stats.get(key);
        if (!item) {
          const ordered = [player, teammate].sort((a, b) =>
            String(a.id).localeCompare(String(b.id))
          );
          item = emptyPair(ordered[0], ordered[1]);
          stats.set(key, item);
        }
        if (item.matchIds.has(match.id)) continue;
        item.matchIds.add(match.id);
        item.games += 1;
        if (match.win) item.wins += 1;
        else item.losses += 1;
        item.lastPlayedAt = Math.max(
          Number(item.lastPlayedAt || 0),
          Number(match.endedAt || 0)
        );
      }
    }
  }

  return finalizeDuoStats(stats);
}

export function buildDuoStatsFromParticipantRows(players, participants) {
  const playerByPuuid = new Map(
    players.filter((player) => player.puuid).map((player) => [player.puuid, player])
  );
  const byMatchAndTeam = new Map();

  for (const participant of participants || []) {
    if (Number(participant.queue_id) !== 420) continue;
    if (!playerByPuuid.has(participant.puuid)) continue;
    const key = `${participant.match_id}::${participant.team_id}`;
    if (!byMatchAndTeam.has(key)) byMatchAndTeam.set(key, []);
    byMatchAndTeam.get(key).push(participant);
  }

  const stats = new Map();
  for (const sameTeam of byMatchAndTeam.values()) {
    if (sameTeam.length < 2) continue;

    for (let i = 0; i < sameTeam.length; i += 1) {
      for (let j = i + 1; j < sameTeam.length; j += 1) {
        const rowA = sameTeam[i];
        const rowB = sameTeam[j];
        const playerA = playerByPuuid.get(rowA.puuid);
        const playerB = playerByPuuid.get(rowB.puuid);
        if (!playerA || !playerB || playerA.id === playerB.id) continue;

        const key = pairKey(playerA.id, playerB.id);
        let item = stats.get(key);
        if (!item) {
          const ordered = [playerA, playerB].sort((a, b) =>
            String(a.id).localeCompare(String(b.id))
          );
          item = emptyPair(ordered[0], ordered[1]);
          stats.set(key, item);
        }
        if (item.matchIds.has(rowA.match_id)) continue;

        item.matchIds.add(rowA.match_id);
        item.games += 1;
        if (rowA.win) item.wins += 1;
        else item.losses += 1;
        const playedAt = rowA.played_at
          ? new Date(rowA.played_at).getTime()
          : 0;
        item.lastPlayedAt = Math.max(Number(item.lastPlayedAt || 0), playedAt);
      }
    }
  }

  return finalizeDuoStats(stats);
}

async function buildDuoStatsFromCache(players) {
  const supabase = getSupabase();
  const puuids = players.filter((player) => player.puuid).map((player) => player.puuid);
  const matchIds = [
    ...new Set(
      players.flatMap((player) =>
        (Array.isArray(player.recent_matches) ? player.recent_matches : [])
          .slice(0, riotSettings.recentMatchCount)
          .map((match) => match.id)
          .filter(Boolean)
      )
    )
  ];

  if (puuids.length < 2 || !matchIds.length) return [];

  const participants = [];
  const chunkSize = 80;
  for (let index = 0; index < matchIds.length; index += chunkSize) {
    const chunk = matchIds.slice(index, index + chunkSize);
    const { data, error } = await supabase
      .from("match_participants")
      .select("match_id,puuid,team_id,win,queue_id,played_at")
      .in("match_id", chunk)
      .in("puuid", puuids)
      .eq("queue_id", 420);
    if (error) throw error;
    participants.push(...(data || []));
  }

  return buildDuoStatsFromParticipantRows(players, participants);
}

async function buildDuoStats(players) {
  try {
    return await buildDuoStatsFromCache(players);
  } catch (error) {
    console.warn("듀오 캐시 조회 실패, 최근 전적 JSON으로 대체합니다.", error);
    return buildDuoStatsFromRecentMatches(players);
  }
}

export async function resolveDuePredictions(players) {
  const supabase = getSupabase();
  const { data: due, error } = await supabase
    .from("predictions")
    .select("id,player_id,resolves_at,status")
    .eq("status", "pending")
    .lte("resolves_at", new Date().toISOString())
    .limit(20);

  if (error) throw error;
  if (!due?.length) return;

  const byId = new Map(players.map((player) => [player.id, player]));

  for (const prediction of due) {
    let player = byId.get(prediction.player_id);
    if (!player) continue;

    if (isStale(player)) {
      try {
        player = await refreshPlayer(player);
        byId.set(player.id, player);
      } catch {
        continue;
      }
    }

    if (!Number.isFinite(Number(player.rank_score))) continue;

    const { error: resolveError } = await supabase.rpc("resolve_prediction", {
      p_prediction_id: prediction.id,
      p_current_score: Number(player.rank_score)
    });
    if (resolveError) console.error("예측 판정 실패", resolveError);
  }
}

export async function buildDashboard({ force = false, user = null } = {}) {
  const supabase = getSupabase();

  const { data: initialPlayers, error: initialError } = await supabase
    .from("players")
    .select("*")
    .eq("is_active", true)
    .order("added_at", { ascending: true });

  if (initialError) throw initialError;

  const refreshCandidates = (force
    ? initialPlayers || []
    : (initialPlayers || []).filter(isStale)
  ).sort((a, b) => playerUpdatedAt(a) - playerUpdatedAt(b));

  // 최근 20경기 상세 조회가 최초에는 무거우므로 한 요청당 강제 2명,
  // 일반 조회 1명씩 순환 갱신합니다. 캐시가 채워진 뒤에는 호출량이 크게 줄어듭니다.
  await refreshPlayers(refreshCandidates, force ? 2 : 1);

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("*")
    .eq("is_active", true)
    .order("rank_score", { ascending: false, nullsFirst: false });

  if (playersError) throw playersError;

  await resolveDuePredictions(players || []);

  const [{ data: messages, error: messagesError }, { data: pointLeaders, error: leadersError }] =
    await Promise.all([
      supabase
        .from("chat_messages")
        .select("id,message,created_at,user_id,user:users(nickname)")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("users")
        .select("id,nickname,oakkk")
        .order("oakkk", { ascending: false })
        .limit(5)
    ]);

  if (messagesError) throw messagesError;
  if (leadersError) throw leadersError;

  let myPredictions = [];
  let currentUser = user;
  if (user) {
    const [{ data: predictions, error: predictionError }, { data: refreshedUser, error: userError }] =
      await Promise.all([
        supabase
          .from("predictions")
          .select(
            "id,player_id,direction,base_score,score_delta,potential_reward,target_score,target_label,resolves_at,status,reward,created_at,player:players(game_name,tag_line)"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("users")
          .select("id,nickname,oakkk,created_at")
          .eq("id", user.id)
          .maybeSingle()
      ]);

    if (predictionError) throw predictionError;
    if (userError) throw userError;
    myPredictions = predictions || [];
    currentUser = refreshedUser || user;
  }

  const winKing =
    [...(players || [])].sort(
      (a, b) =>
        Number(b.current_win_streak || 0) -
          Number(a.current_win_streak || 0) ||
        Number(b.rank_score || -1) - Number(a.rank_score || -1)
    )[0] || null;

  const lossKing =
    [...(players || [])].sort(
      (a, b) =>
        Number(b.current_loss_streak || 0) -
          Number(a.current_loss_streak || 0) ||
        Number(b.rank_score || -1) - Number(a.rank_score || -1)
    )[0] || null;

  const duoStats = await buildDuoStats(players || []);
  const reliableDuos = duoStats.filter(
    (item) => item.games >= DUO_MIN_GAMES_FOR_HIGHLIGHT
  );
  const comparisonPool = reliableDuos.length ? reliableDuos : duoStats;
  const bestDuo = comparisonPool.length
    ? [...comparisonPool].sort(
        (a, b) => b.winRate - a.winRate || b.games - a.games
      )[0]
    : null;
  const worstDuo = comparisonPool.length
    ? [...comparisonPool].sort(
        (a, b) => a.winRate - b.winRate || b.games - a.games
      )[0]
    : null;

  const playersWithMatchData = (players || []).filter(
    (player) => Array.isArray(player.recent_matches) && player.recent_matches.length > 0
  ).length;
  const cachedMatchCount = new Set(
    (players || []).flatMap((player) =>
      (Array.isArray(player.recent_matches) ? player.recent_matches : []).map(
        (match) => match.id
      )
    )
  ).size;

  return {
    players: players || [],
    winKing,
    lossKing,
    duoStats,
    bestDuo,
    worstDuo,
    duoCoverage: {
      playersWithMatchData,
      totalPlayers: (players || []).length,
      cachedMatchCount,
      recentMatchCount: riotSettings.recentMatchCount,
      highlightMinGames: DUO_MIN_GAMES_FOR_HIGHLIGHT
    },
    messages: (messages || []).reverse(),
    pointLeaders: pointLeaders || [],
    myPredictions,
    me: currentUser,
    updatedAt: new Date().toISOString(),
    rules: {
      predictionHours: 48,
      dailyPredictionLimit: 1,
      rewardRange: [5, 20],
      wrongPenalty: 0,
      currencyTransferable: false,
      currencyPurchasable: false,
      currencyCashValue: false
    }
  };
}
