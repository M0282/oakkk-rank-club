import crypto from "node:crypto";
import { resolveDuePredictions } from "../lib/server/dashboard.js";
import { refreshPlayers } from "../lib/server/riot.js";
import { getSupabase } from "../lib/server/supabase.js";
import { handleError, json, methodNotAllowed } from "../lib/server/http.js";

function requireCron(request) {
  const expected = process.env.CRON_SECRET || "";
  const header = request.headers.get("authorization") || "";
  const supplied = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!expected) {
    const error = new Error("CRON_SECRET이 설정되지 않았습니다.");
    error.status = 503;
    throw error;
  }

  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    const error = new Error("Cron 인증에 실패했습니다.");
    error.status = 401;
    throw error;
  }
}

export default {
  async fetch(request) {
    try {
      if (request.method !== "GET" && request.method !== "POST") {
        return methodNotAllowed();
      }
      requireCron(request);

      const supabase = getSupabase();
      const { data: players, error } = await supabase
        .from("players")
        .select("*")
        .eq("is_active", true)
        .order("updated_at", { ascending: true, nullsFirst: true });

      if (error) throw error;

      const stale = (players || []).filter((player) => {
        if (!player.updated_at) return true;
        return Date.now() - new Date(player.updated_at).getTime() > 5 * 60 * 1000;
      });

      const refreshResults = await refreshPlayers(stale, 2);

      const { data: currentPlayers, error: currentError } = await supabase
        .from("players")
        .select("*")
        .eq("is_active", true);

      if (currentError) throw currentError;
      await resolveDuePredictions(currentPlayers || []);

      return json({
        ok: true,
        refreshed: refreshResults.length,
        completedAt: new Date().toISOString()
      });
    } catch (error) {
      return handleError(error);
    }
  }
};
