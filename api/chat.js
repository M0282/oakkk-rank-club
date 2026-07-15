import { requireAdmin, requireUser } from "../lib/server/auth.js";
import {
  cleanText, handleError, json, methodNotAllowed, readJson
} from "../lib/server/http.js";
import { getSupabase } from "../lib/server/supabase.js";

export default {
  async fetch(request) {
    try {
      const supabase = getSupabase();

      if (request.method === "GET") {
        const { data, error } = await supabase
          .from("chat_messages")
          .select("id,message,created_at,user_id,user:users(nickname)")
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .limit(30);
        if (error) throw error;
        return json({ messages: (data || []).reverse() });
      }

      if (request.method === "POST") {
        const user = await requireUser(request);
        const body = await readJson(request);
        const message = cleanText(body.message, 100);
        if (!message) return json({ error: "메시지를 입력해 주세요." }, 400);

        const { data: latest, error: latestError } = await supabase
          .from("chat_messages")
          .select("created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestError) throw latestError;
        if (latest &&
            Date.now() - new Date(latest.created_at).getTime() < 10_000) {
          return json({ error: "채팅은 10초에 한 번 작성할 수 있습니다." }, 429);
        }

        const { data, error } = await supabase
          .from("chat_messages")
          .insert({ user_id: user.id, message })
          .select("id,message,created_at,user_id")
          .single();

        if (error) throw error;
        return json({
          message: { ...data, user: { nickname: user.nickname } }
        }, 201);
      }

      if (request.method === "DELETE") {
        requireAdmin(request);
        const body = await readJson(request);
        const { error } = await supabase
          .from("chat_messages")
          .update({ is_deleted: true })
          .eq("id", Number(body.messageId));
        if (error) throw error;
        return json({ ok: true });
      }

      return methodNotAllowed();
    } catch (error) {
      return handleError(error);
    }
  }
};
