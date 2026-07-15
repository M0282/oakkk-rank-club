import { getSupabase } from "../lib/server/supabase.js";
import {
  createSession,
  hashPin,
  verifyPin,
  optionalUser
} from "../lib/server/auth.js";
import {
  cleanText,
  handleError,
  json,
  methodNotAllowed,
  readJson
} from "../lib/server/http.js";

export default {
  async fetch(request) {
    try {
      if (request.method === "GET") {
        return json({ user: await optionalUser(request) });
      }
      if (request.method !== "POST") return methodNotAllowed();

      const body = await readJson(request);
      const action = String(body.action || "");
      const nickname = cleanText(body.nickname, 16);
      const pin = String(body.pin || "");
      const supabase = getSupabase();

      if (!nickname || nickname.length < 2) {
        return json({ error: "닉네임은 2~16자로 입력해 주세요." }, 400);
      }

      if (action === "register") {
        if (!process.env.INVITE_CODE ||
            String(body.inviteCode || "") !== process.env.INVITE_CODE) {
          return json({ error: "초대 코드가 올바르지 않습니다." }, 403);
        }

        const { data, error } = await supabase
          .from("users")
          .insert({ nickname, pin_hash: hashPin(pin) })
          .select("id,nickname,oakkk,created_at")
          .single();

        if (error?.code === "23505") {
          return json({ error: "이미 사용 중인 닉네임입니다." }, 409);
        }
        if (error) throw error;

        return json({ token: createSession(data), user: data });
      }

      if (action === "login") {
        const { data, error } = await supabase
          .from("users")
          .select("id,nickname,pin_hash,oakkk,created_at")
          .ilike("nickname", nickname)
          .maybeSingle();

        if (error) throw error;
        if (!data || !verifyPin(pin, data.pin_hash)) {
          return json({ error: "닉네임 또는 PIN이 올바르지 않습니다." }, 401);
        }

        const user = {
          id: data.id,
          nickname: data.nickname,
          oakkk: data.oakkk,
          created_at: data.created_at
        };
        return json({ token: createSession(user), user });
      }

      return json({ error: "알 수 없는 인증 작업입니다." }, 400);
    } catch (error) {
      return handleError(error);
    }
  }
};
