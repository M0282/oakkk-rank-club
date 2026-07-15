import { requireUser } from "../lib/server/auth.js";
import { handleError, json, methodNotAllowed, readJson } from "../lib/server/http.js";
import { scoreToRankLabel } from "../lib/server/rank.js";
import { getSupabase } from "../lib/server/supabase.js";

function koreaDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export default {
  async fetch(request) {
    try {
      if (request.method !== "POST") return methodNotAllowed();

      const user = await requireUser(request);
      const body = await readJson(request);
      const playerId = String(body.playerId || "");
      const direction = String(body.direction || "");
      const targetScore = Math.round(Number(body.targetScore));

      if (!["over", "under"].includes(direction)) {
        return json({ error: "예측 방향이 올바르지 않습니다." }, 400);
      }
      if (!Number.isFinite(targetScore) ||
          targetScore < 0 || targetScore > 5000) {
        return json({ error: "목표 점수가 올바르지 않습니다." }, 400);
      }

      const supabase = getSupabase();
      const { data: player, error: playerError } = await supabase
        .from("players")
        .select("id,game_name,tag_line,is_active")
        .eq("id", playerId)
        .eq("is_active", true)
        .maybeSingle();

      if (playerError) throw playerError;
      if (!player) return json({ error: "예측할 친구를 찾을 수 없습니다." }, 404);

      const { data, error } = await supabase
        .from("predictions")
        .insert({
          user_id: user.id,
          player_id: playerId,
          prediction_day: koreaDateString(),
          direction,
          target_score: targetScore,
          target_label: scoreToRankLabel(targetScore),
          resolves_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        })
        .select(
          "id,player_id,direction,target_score,target_label,resolves_at,status,reward,created_at"
        )
        .single();

      if (error?.code === "23505") {
        return json({
          error: "오늘의 예측 기회를 이미 사용했습니다. 하루 1회만 가능합니다."
        }, 409);
      }
      if (error) throw error;

      return json({
        prediction: {
          ...data,
          player: { game_name: player.game_name, tag_line: player.tag_line }
        },
        message: "예측이 등록되었습니다. 참가 비용과 오답 차감은 없으며, 정답이면 오크크 10개를 받습니다."
      }, 201);
    } catch (error) {
      return handleError(error);
    }
  }
};
