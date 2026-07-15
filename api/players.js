import { requireAdmin, requireUser } from "../lib/server/auth.js";
import {
  cleanText, handleError, json, methodNotAllowed, readJson
} from "../lib/server/http.js";
import { resolveRiotId, refreshPlayer } from "../lib/server/riot.js";
import { getSupabase } from "../lib/server/supabase.js";

function parseRiotId(value) {
  const text = cleanText(value, 48);
  const index = text.lastIndexOf("#");
  if (index < 1 || index === text.length - 1) {
    const error = new Error("Riot ID를 게임이름#태그 형식으로 입력해 주세요.");
    error.status = 400;
    throw error;
  }
  return {
    gameName: text.slice(0, index).trim(),
    tagLine: text.slice(index + 1).trim()
  };
}

export default {
  async fetch(request) {
    try {
      const supabase = getSupabase();

      if (request.method === "POST") {
        const user = await requireUser(request);
        const body = await readJson(request);
        const parsed = parseRiotId(body.riotId);

        const { count, error: countError } = await supabase
          .from("players")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true);

        if (countError) throw countError;
        if (Number(count || 0) >= 30) {
          return json({ error: "등록 가능한 친구는 최대 30명입니다." }, 409);
        }

        const identity = await resolveRiotId(parsed.gameName, parsed.tagLine);
        const normalized =
          `${identity.gameName}#${identity.tagLine}`.toLowerCase();

        const { data, error } = await supabase
          .from("players")
          .insert({
            game_name: identity.gameName,
            tag_line: identity.tagLine,
            riot_id_normalized: normalized,
            puuid: identity.puuid,
            profile_icon_id: identity.profileIconId,
            summoner_level: identity.summonerLevel,
            added_by: user.id
          })
          .select("*")
          .single();

        if (error?.code === "23505") {
          return json({ error: "이미 등록된 Riot ID입니다." }, 409);
        }
        if (error) throw error;

        let refreshed = data;
        try { refreshed = await refreshPlayer(data); } catch {}
        return json({ player: refreshed }, 201);
      }

      if (request.method === "DELETE") {
        requireAdmin(request);
        const body = await readJson(request);
        const { error } = await supabase
          .from("players")
          .update({ is_active: false })
          .eq("id", String(body.playerId || ""));
        if (error) throw error;
        return json({ ok: true });
      }

      return methodNotAllowed();
    } catch (error) {
      return handleError(error);
    }
  }
};
