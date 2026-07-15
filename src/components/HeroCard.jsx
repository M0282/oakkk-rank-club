import { championIconUrl, profileIconUrl, rankLabel } from "../lib/rank";

export default function HeroCard({ type, player }) {
  const isWin = type === "win";
  const streak = Number(
    isWin ? player?.current_win_streak : player?.current_loss_streak
  );

  if (!player) {
    return (
      <article className={`hero-card ${isWin ? "win-card" : "loss-card"}`}>
        <div className="eyebrow">{isWin ? "WIN STREAK" : "LOSS STREAK"}</div>
        <h2>등록된 친구가 없습니다</h2>
      </article>
    );
  }

  const recent = (player.recent_matches || []).slice(0, 5);
  const latest = recent[0];
  const capped = recent.length === streak && streak === 5 ? "+" : "";

  return (
    <article className={`hero-card ${isWin ? "win-card" : "loss-card"}`}>
      <div className="hero-top">
        <div className="hero-title">
          <span className="hero-crown">{isWin ? "🔥" : "☠"}</span>
          <div>
            <div className="eyebrow">
              {isWin ? "CURRENT WIN KING" : "CURRENT LOSS KING"}
            </div>
            <h2>
              {streak > 0
                ? `${streak}${capped}연${isWin ? "승" : "패"}`
                : `현재 연${isWin ? "승" : "패"} 없음`}
            </h2>
          </div>
        </div>
        <img className="hero-profile"
          src={profileIconUrl(player.profile_icon_id)} alt="" />
      </div>

      <div className="hero-player">
        <strong>{player.game_name}#{player.tag_line}</strong>
        <span>{rankLabel(player)} · {player.lp ?? "-"} LP</span>
      </div>

      <div className="hero-form">
        {recent.map((match) => (
          <i key={match.id} className={match.win ? "win" : "loss"}
            title={match.win ? "승리" : "패배"} />
        ))}
      </div>

      {latest && (
        <div className="latest-game">
          <img src={championIconUrl(latest.championId)} alt="" />
          <div>
            <span>LAST SOLO GAME</span>
            <strong>{latest.champion}</strong>
          </div>
          <b>{latest.kills}/{latest.deaths}/{latest.assists}</b>
        </div>
      )}
    </article>
  );
}
