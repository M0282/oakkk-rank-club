import { getSupabase } from "./supabase.js";
import { rankScore, streaks } from "./rank.js";

const ACCOUNT_HOST = "https://asia.api.riotgames.com";
const KR_HOST = "https://kr.api.riotgames.com";
const MATCH_HOST = "https://asia.api.riotgames.com";

async function riotFetch(url) {
  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    const error = new Error("RIOT_API_KEY가 설정되지 않았습니다.");
    error.status = 503;
    throw error;
  }

  const response = await fetch(url, {
    headers: { "X-Riot-Token": apiKey }
  });

  if (!response.ok) {
    let body = "";
    try { body = await response.text(); } catch {}
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

async function matchDetail(matchId, puuid) {
  const match = await riotFetch(
    `${MATCH_HOST}/lol/match/v5/matches/${encodeURIComponent(matchId)}`
  );

  const participant = match.info.participants.find(
    (item) => item.puuid === puuid
  );
  if (!participant) return null;

  return {
    id: matchId,
    win: Boolean(participant.win),
    champion: participant.championName,
    championId: participant.championId,
    kills: participant.kills,
    deaths: participant.deaths,
    assists: participant.assists,
    cs: Number(participant.totalMinionsKilled || 0) +
      Number(participant.neutralMinionsKilled || 0),
    duration: Number(match.info.gameDuration || 0),
    endedAt: match.info.gameEndTimestamp ||
      match.info.gameCreation ||
      Date.now()
  };
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
      `${MATCH_HOST}/lol/match/v5/matches/by-puuid/${encodeURIComponent(identity.puuid)}/ids?queue=420&start=0&count=5`
    )
  ]);

  const solo =
    entries.find((entry) => entry.queueType === "RANKED_SOLO_5x5") || null;

  const cached = new Map(
    (Array.isArray(player.recent_matches) ? player.recent_matches : [])
      .map((match) => [match.id, match])
  );

  const recentMatches = await Promise.all(
    matchIds.map(async (matchId) => {
      if (cached.has(matchId)) return cached.get(matchId);
      return matchDetail(matchId, identity.puuid);
    })
  );

  const matches = recentMatches.filter(Boolean);
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

export async function refreshPlayers(players, limit = 3) {
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
