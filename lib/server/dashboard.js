import { getSupabase } from "./supabase.js";
import { refreshPlayer, refreshPlayers } from "./riot.js";

const STALE_MS = 5 * 60 * 1000;

function isStale(player) {
  if (!player.updated_at) return true;
  return Date.now() - new Date(player.updated_at).getTime() > STALE_MS;
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

    await supabase.rpc("resolve_prediction", {
      p_prediction_id: prediction.id,
      p_current_score: Number(player.rank_score)
    });
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

  const stalePlayers = (initialPlayers || []).filter(isStale);
  await refreshPlayers(stalePlayers, force ? 6 : 3);

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("*")
    .eq("is_active", true)
    .order("rank_score", { ascending: false, nullsFirst: false });

  if (playersError) throw playersError;

  await resolveDuePredictions(players || []);

  const { data: messages, error: messagesError } = await supabase
    .from("chat_messages")
    .select("id,message,created_at,user_id,user:users(nickname)")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(30);

  if (messagesError) throw messagesError;

  const { data: pointLeaders, error: leadersError } = await supabase
    .from("users")
    .select("id,nickname,oakkk")
    .order("oakkk", { ascending: false })
    .limit(5);

  if (leadersError) throw leadersError;

  let myPredictions = [];
  if (user) {
    const { data, error } = await supabase
      .from("predictions")
      .select(
        "id,player_id,direction,target_score,target_label,resolves_at,status,reward,created_at,player:players(game_name,tag_line)"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;
    myPredictions = data || [];
  }

  const winKing = [...(players || [])]
    .sort((a, b) =>
      Number(b.current_win_streak || 0) -
        Number(a.current_win_streak || 0) ||
      Number(b.rank_score || -1) - Number(a.rank_score || -1)
    )[0] || null;

  const lossKing = [...(players || [])]
    .sort((a, b) =>
      Number(b.current_loss_streak || 0) -
        Number(a.current_loss_streak || 0) ||
      Number(b.rank_score || -1) - Number(a.rank_score || -1)
    )[0] || null;

  return {
    players: players || [],
    winKing,
    lossKing,
    messages: (messages || []).reverse(),
    pointLeaders: pointLeaders || [],
    myPredictions,
    me: user,
    updatedAt: new Date().toISOString(),
    rules: {
      predictionHours: 48,
      dailyPredictionLimit: 1,
      correctReward: 10,
      wrongPenalty: 0,
      currencyTransferable: false,
      currencyPurchasable: false,
      currencyCashValue: false
    }
  };
}
