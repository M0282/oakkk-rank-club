import { getSupabase } from "./supabase.js";
import { rankScore, streaks } from "./rank.js";

const ACCOUNT_HOST = "https://asia.api.riotgames.com";
const KR_HOST = "https://kr.api.riotgames.com";
const MATCH_HOST = "https://asia.api.riotgames.com";
const RECENT_MATCH_COUNT = 20;
const MATCH_FETCH_BATCH_SIZE = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isMissingCacheTableError(error) {
  const text = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
  return text.includes("42p01") ||
    text.includes("pgrst205") ||
    text.includes("match_participants") ||
    text.includes("public.matches");
}

async function riotFetch(url, attempt = 0) {
  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    const error = new Error("RIOT_API_KEY가 설정되지 않았습니다.");
    error.status = 503;
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  let response;
  try {
    response = await fetch(url, {
      headers: { "X-Riot-Token": apiKey },
      signal: controller.signal
    });
  } catch (error) {
    clearTimeout(timeout);
    if (attempt < 1) {
      await sleep(500);
      return riotFetch(url, attempt + 1);
    }
    const wrapped = new Error(
      error?.name === "AbortError"
        ? "Riot API 응답 시간이 초과되었습니다."
        : `Riot API 연결 실패: ${error?.message || "알 수 없는 오류"}`
    );
    wrapped.status = 503;
    throw wrapped;
  }
  clearTimeout(timeout);

  if (!response.ok) {
    if (response.status === 429 && attempt < 2) {
      const retryAfter = Math.max(
        1,
        Math.min(3, Number(response.headers.get("retry-after") || 1))
      );
      await sleep(retryAfter * 1000);
      return riotFetch(url, attempt + 1);
    }

    if (response.status >= 500 && attempt < 1) {
      await sleep(500);
      return riotFetch(url, attempt + 1);
    }

    let body = "";
    try {
      body = await response.text();
    } catch {}

    const error = new Error(
      `Riot API ${response.status}${body ? `: ${body.slice(0, 150)}` : ""}`
    );
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export async function resolveRiotId(gameName, tagLine) {
  const identity = await riotFetch(
    `${ACCOUNT_HOST}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
  );

  const summoner = await riotFetch(
    `${KR_HOST}/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(identity.puuid)}`
  );

  return {
    gameName: identity.gameName,
    tagLine: identity.tagLine,
    puuid: identity.puuid,
    profileIconId: summoner.profileIconId,
    summonerLevel: summoner.summonerLevel
  };
}

export function normalizeMatchForCache(matchId, match) {
  const info = match?.info || {};
  const participants = Array.isArray(info.participants)
    ? info.participants
    : [];
  const endedAt = Number(
    info.gameEndTimestamp ||
      (Number(info.gameStartTimestamp || info.gameCreation || Date.now()) +
        Number(info.gameDuration || 0) * 1000)
  );
  const playedAt = new Date(endedAt).toISOString();
  const queueId = Number(info.queueId || 0);

  return {
    match: {
      match_id: matchId,
      queue_id: queueId,
      game_duration: Number(info.gameDuration || 0),
      game_started_at: new Date(
        Number(info.gameStartTimestamp || info.gameCreation || endedAt)
      ).toISOString(),
      game_ended_at: playedAt,
      updated_at: new Date().toISOString()
    },
    participants: participants.map((participant) => ({
      match_id: matchId,
      puuid: participant.puuid,
      team_id: Number(participant.teamId),
      win: Boolean(participant.win),
      champion_name: participant.championName || "",
      champion_id: Number(participant.championId || 0),
      kills: Number(participant.kills || 0),
      deaths: Number(participant.deaths || 0),
      assists: Number(participant.assists || 0),
      cs:
        Number(participant.totalMinionsKilled || 0) +
        Number(participant.neutralMinionsKilled || 0),
      queue_id: queueId,
      played_at: playedAt
    }))
  };
}

async function cacheMatch(supabase, matchId) {
  const raw = await riotFetch(
    `${MATCH_HOST}/lol/match/v5/matches/${encodeURIComponent(matchId)}`
  );
  const detail = normalizeMatchForCache(matchId, raw);

  const { error: matchError } = await supabase
    .from("matches")
    .upsert(detail.match, { onConflict: "match_id" });
  if (matchError) throw matchError;

  if (detail.participants.length) {
    const { error: participantError } = await supabase
      .from("match_participants")
      .upsert(detail.participants, { onConflict: "match_id,puuid" });
    if (participantError) throw participantError;
  }

  return detail;
}

async function readCachedDetails(supabase, matchIds) {
  if (!matchIds.length) return new Map();

  const [{ data: matches, error: matchError }, { data: participants, error: participantError }] =
    await Promise.all([
      supabase
        .from("matches")
        .select("match_id,queue_id,game_duration,game_started_at,game_ended_at")
        .in("match_id", matchIds),
      supabase
        .from("match_participants")
        .select(
          "match_id,puuid,team_id,win,champion_name,champion_id,kills,deaths,assists,cs,queue_id,played_at"
        )
        .in("match_id", matchIds)
    ]);

  if (matchError) throw matchError;
  if (participantError) throw participantError;

  const details = new Map();
  for (const match of matches || []) {
    details.set(match.match_id, { match, participants: [] });
  }
  for (const participant of participants || []) {
    const detail = details.get(participant.match_id);
    if (detail) detail.participants.push(participant);
  }
  return details;
}

export function matchSummaryFromCache(matchId, detail, puuid) {
  const participant = detail?.participants?.find((item) => item.puuid === puuid);
  if (!participant) return null;

  const endedAt = detail.match?.game_ended_at || participant.played_at;
  return {
    id: matchId,
    win: Boolean(participant.win),
    champion: participant.champion_name,
    championId: Number(participant.champion_id || 0),
    kills: Number(participant.kills || 0),
    deaths: Number(participant.deaths || 0),
    assists: Number(participant.assists || 0),
    cs: Number(participant.cs || 0),
    duration: Number(detail.match?.game_duration || 0),
    endedAt: endedAt ? new Date(endedAt).getTime() : Date.now(),
    queueId: Number(detail.match?.queue_id || participant.queue_id || 0),
    teamId: Number(participant.team_id)
  };
}

async function directMatchSummary(matchId, puuid) {
  const raw = await riotFetch(
    `${MATCH_HOST}/lol/match/v5/matches/${encodeURIComponent(matchId)}`
  );
  const detail = normalizeMatchForCache(matchId, raw);
  const own = detail.participants.find((item) => item.puuid === puuid);
  if (!own) return null;

  return {
    ...matchSummaryFromCache(matchId, detail, puuid),
    teammatePuuids: detail.participants
      .filter((item) => item.team_id === own.team_id && item.puuid !== puuid)
      .map((item) => item.puuid)
  };
}

async function loadRecentMatches(supabase, matchIds, puuid) {
  try {
    let cached = await readCachedDetails(supabase, matchIds);
    const missing = matchIds.filter((matchId) => {
      const detail = cached.get(matchId);
      return !detail || detail.participants.length < 10;
    });

    for (let index = 0; index < missing.length; index += MATCH_FETCH_BATCH_SIZE) {
      const batch = missing.slice(index, index + MATCH_FETCH_BATCH_SIZE);
      await Promise.allSettled(batch.map((matchId) => cacheMatch(supabase, matchId)));
      if (index + MATCH_FETCH_BATCH_SIZE < missing.length) await sleep(300);
    }

    cached = await readCachedDetails(supabase, matchIds);
    return matchIds
      .map((matchId) => matchSummaryFromCache(matchId, cached.get(matchId), puuid))
      .filter(Boolean);
  } catch (error) {
    if (!isMissingCacheTableError(error)) throw error;

    const summaries = [];
    for (let index = 0; index < matchIds.length; index += MATCH_FETCH_BATCH_SIZE) {
      const batch = matchIds.slice(index, index + MATCH_FETCH_BATCH_SIZE);
      const settled = await Promise.allSettled(
        batch.map((matchId) => directMatchSummary(matchId, puuid))
      );
      for (const item of settled) {
        if (item.status === "fulfilled" && item.value) summaries.push(item.value);
      }
      if (index + MATCH_FETCH_BATCH_SIZE < matchIds.length) await sleep(300);
    }
    const order = new Map(matchIds.map((id, index) => [id, index]));
    return summaries.sort((a, b) => order.get(a.id) - order.get(b.id));
  }
}

export async function refreshPlayer(player) {
  const supabase = getSupabase();
  let identity = {
    gameName: player.game_name,
    tagLine: player.tag_line,
    puuid: player.puuid,
    profileIconId: player.profile_icon_id,
    summonerLevel: player.summoner_level
  };

  if (!identity.puuid) {
    identity = await resolveRiotId(player.game_name, player.tag_line);
  }

  const [entries, matchIds] = await Promise.all([
    riotFetch(
      `${KR_HOST}/lol/league/v4/entries/by-puuid/${encodeURIComponent(identity.puuid)}`
    ),
    riotFetch(
      `${MATCH_HOST}/lol/match/v5/matches/by-puuid/${encodeURIComponent(identity.puuid)}/ids?queue=420&start=0&count=${RECENT_MATCH_COUNT}`
    )
  ]);

  const solo =
    entries.find((entry) => entry.queueType === "RANKED_SOLO_5x5") || null;
  const matches = await loadRecentMatches(
    supabase,
    Array.isArray(matchIds) ? matchIds.slice(0, RECENT_MATCH_COUNT) : [],
    identity.puuid
  );
  const current = streaks(matches);

  const update = {
    game_name: identity.gameName,
    tag_line: identity.tagLine,
    riot_id_normalized: `${identity.gameName}#${identity.tagLine}`.toLowerCase(),
    puuid: identity.puuid,
    profile_icon_id: identity.profileIconId,
    summoner_level: identity.summonerLevel,
    tier: solo?.tier || null,
    division: solo?.rank || null,
    lp: solo?.leaguePoints ?? null,
    wins: solo?.wins ?? null,
    losses: solo?.losses ?? null,
    rank_score: rankScore(solo),
    recent_matches: matches,
    current_win_streak: current.wins,
    current_loss_streak: current.losses,
    last_game_at: matches[0]?.endedAt
      ? new Date(matches[0].endedAt).toISOString()
      : null,
    last_error: null,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("players")
    .update(update)
    .eq("id", player.id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function refreshPlayers(players, limit = 1) {
  const results = [];
  for (const player of players.slice(0, limit)) {
    try {
      results.push({ ok: true, player: await refreshPlayer(player) });
    } catch (error) {
      const supabase = getSupabase();
      await supabase
        .from("players")
        .update({
          last_error: error.message,
          updated_at: new Date().toISOString()
        })
        .eq("id", player.id);

      results.push({ ok: false, playerId: player.id, error: error.message });
    }
  }
  return results;
}

export const riotSettings = {
  recentMatchCount: RECENT_MATCH_COUNT
};
