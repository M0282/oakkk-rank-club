import { createClient } from "@supabase/supabase-js";

let client;

export function getSupabase() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    const error = new Error(
      "SUPABASE_URL과 SUPABASE_SECRET_KEY가 설정되지 않았습니다."
    );
    error.status = 503;
    throw error;
  }

  client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  return client;
}
