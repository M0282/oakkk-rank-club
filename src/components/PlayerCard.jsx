import { profileIconUrl, rankLabel, recentRate } from "../lib/rank";

export default function PlayerCard({
  player, adminMode, onDelete, onPredict
}) {
  const matches = (player.recent_matches || []).slice(0, 3);
  const streak = player.current_win_streak
    ? `${player.current_win_streak}${player.current_win_streak === 5 ? "+" : ""}연승`
    : player.current_loss_streak
      ? `${player.current_loss_streak}${player.current_loss_streak === 5 ? "+" : ""}연패`
      : "연속 기록 없음";

  return (
    <article className="player-card">
      {adminMode && (
        <button className="delete-button"
          onClick={() => onDelete(player.id)} title="친구 삭제">×</button>
      )}

      <div className="player-head">
        <img className="profile-icon"
          src={profileIconUrl(player.profile_icon_id)} alt="" />
        <div className="player-name">
          <strong>{player.game_name}</strong>
          <span>#{player.tag_line}</span>
        </div>
        <div className="mini-level">LV.{player.summoner_level || "-"}</div>
      </div>

      <div className="player-rank-row">
        <div>
          <span>SOLO RANK</span>
          <strong>{rankLabel(player)}</strong>
        </div>
        <div className="small-lp">
          <strong>{player.lp ?? "-"}</strong><span>LP</span>
        </div>
      </div>

      <div className="mini-form">
        <div className="result-dots">
          {matches.map((match) => (
            <i key={match.id} className={match.win ? "win" : "loss"}>
              {match.win ? "W" : "L"}
            </i>
          ))}
        </div>
        <strong>{recentRate(player, 3)}%</strong>
      </div>

      <div className="player-foot">
        <span className={
          player.current_loss_streak ? "negative-text" :
          player.current_win_streak ? "positive-text" : ""
        }>{streak}</span>
        <button className="text-button"
          onClick={() => onPredict(player)}
          disabled={!Number.isFinite(Number(player.rank_score))}>
          예측 만들기
        </button>
      </div>

      {player.last_error && (
        <div className="player-error" title={player.last_error}>
          데이터 갱신 오류
        </div>
      )}
    </article>
  );
}
