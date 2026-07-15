import { requireUser } from "../lib/server/auth.js";
import {
  handleError,
  json,
  methodNotAllowed,
  readJson
} from "../lib/server/http.js";
import { scoreToRankLabel } from "../lib/server/rank.js";
import { getSupabase } from "../lib/server/supabase.js";
import {
  ALLOWED_PREDICTION_OFFSETS,
  predictionReward
} from "../shared/prediction.js";

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
      const scoreDelta = Math.round(Number(body.scoreDelta ?? body.offset));

      if (!["over", "under"].includes(direction)) {
        return json({ error: "예측 방향이 올바르지 않습니다." }, 400);
      }
      if (!ALLOWED_PREDICTION_OFFSETS.includes(scoreDelta)) {
        return json({ error: "목표 점수 조정값이 올바르지 않습니다." }, 400);
      }

      const supabase = getSupabase();
      const { data: player, error: playerError } = await supabase
        .from("players")
        .select("id,game_name,tag_line,rank_score,is_active")
        .eq("id", playerId)
        .eq("is_active", true)
        .maybeSingle();

      if (playerError) throw playerError;
      if (!player) {
        return json({ error: "예측할 친구를 찾을 수 없습니다." }, 404);
      }
      if (!Number.isFinite(Number(player.rank_score))) {
        return json({ error: "현재 랭크 점수를 확인할 수 없습니다." }, 409);
      }

      const baseScore = Math.round(Number(player.rank_score));
      const targetScore = Math.max(0, Math.min(5000, baseScore + scoreDelta));
      const potentialReward = predictionReward(direction, scoreDelta);

      const { data, error } = await supabase
        .from("predictions")
        .insert({
          user_id: user.id,
          player_id: playerId,
          prediction_day: koreaDateString(),
          direction,
          base_score: baseScore,
          score_delta: scoreDelta,
          potential_reward: potentialReward,
          target_score: targetScore,
          target_label: scoreToRankLabel(targetScore),
          resolves_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        })
        .select(
          "id,player_id,direction,base_score,score_delta,potential_reward,target_score,target_label,resolves_at,status,reward,created_at"
        )
        .single();

      if (error?.code === "23505") {
        return json(
          {
            error:
              "오늘의 예측 기회를 이미 사용했습니다. 하루 1회만 가능합니다."
          },
          409
        );
      }
      if (error) throw error;

      return json(
        {
          prediction: {
            ...data,
            player: {
              game_name: player.game_name,
              tag_line: player.tag_line
            }
          },
          message: `예측이 등록되었습니다. 오답 차감은 없으며 정답 보상은 ${potentialReward} 오크크입니다.`
        },
        201
      );
    } catch (error) {
      return handleError(error);
    }
  }
};
