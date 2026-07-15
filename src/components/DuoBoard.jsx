import { useMemo, useState } from "react";

function pairName(item) {
  if (!item) return "기록 없음";
  return `${item.playerA.game_name} × ${item.playerB.game_name}`;
}

function lastPlayed(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function HighlightCard({ type, item, minGames }) {
  const best = type === "best";
  return (
    <article className={`duo-highlight ${best ? "best" : "worst"}`}>
      <div className="eyebrow">
        {best ? "BEST SAME-TEAM RATE" : "LOWEST SAME-TEAM RATE"}
      </div>
      {item ? (
        <>
          <h2>{pairName(item)}</h2>
          <div className="duo-rate">{item.winRate}%</div>
          <p>
            {item.games}경기 · {item.wins}승 {item.losses}패
          </p>
          <small>
            {minGames}경기 이상 조합 우선 · 최근 기록 {lastPlayed(item.lastPlayedAt)}
          </small>
        </>
      ) : (
        <div className="duo-empty-highlight">
          <strong>아직 비교할 기록이 없습니다.</strong>
          <p>등록된 플레이어들의 최근 전적 갱신이 끝나면 표시됩니다.</p>
        </div>
      )}
    </article>
  );
}

export default function DuoBoard({
  duoStats = [],
  bestDuo,
  worstDuo,
  coverage
}) {
  const [minimumGames, setMinimumGames] = useState(1);
  const filtered = useMemo(
    () => duoStats.filter((item) => item.games >= minimumGames),
    [duoStats, minimumGames]
  );

  return (
    <section className="duo-page">
      <div className="section-heading duo-page-heading">
        <div>
          <div className="eyebrow">REGISTERED PLAYER PAIRS</div>
          <h2>함께한 솔로랭크 승률</h2>
          <p>
            등록된 플레이어별 최근 {coverage?.recentMatchCount || 20}경기에서
            같은 팀으로 만난 솔로랭크 기록을 합산합니다.
          </p>
        </div>
        <div className="coverage-chip">
          <span>수집 현황</span>
          <strong>
            {coverage?.playersWithMatchData || 0}/{coverage?.totalPlayers || 0}명 ·{" "}
            {coverage?.cachedMatchCount || 0}경기
          </strong>
        </div>
      </div>

      <div className="duo-highlight-grid">
        <HighlightCard
          type="best"
          item={bestDuo}
          minGames={coverage?.highlightMinGames || 2}
        />
        <HighlightCard
          type="worst"
          item={worstDuo}
          minGames={coverage?.highlightMinGames || 2}
        />
      </div>

      <section className="duo-table-panel">
        <div className="panel-heading duo-table-heading">
          <div>
            <div className="eyebrow">ALL COMBINATIONS</div>
            <h2>전체 같은 팀 조합</h2>
          </div>
          <label className="duo-filter">
            최소 경기 수
            <select
              value={minimumGames}
              onChange={(event) => setMinimumGames(Number(event.target.value))}
            >
              {[1, 2, 3, 5, 10].map((value) => (
                <option key={value} value={value}>
                  {value}경기 이상
                </option>
              ))}
            </select>
          </label>
        </div>

        {filtered.length ? (
          <div className="duo-table-wrap">
            <table className="duo-table">
              <thead>
                <tr>
                  <th>순위</th>
                  <th>조합</th>
                  <th>경기</th>
                  <th>승</th>
                  <th>패</th>
                  <th>승률</th>
                  <th>최근 함께한 경기</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, index) => (
                  <tr key={`${item.playerA.id}-${item.playerB.id}`}>
                    <td>{String(index + 1).padStart(2, "0")}</td>
                    <td>
                      <strong>{pairName(item)}</strong>
                      <small>
                        #{item.playerA.tag_line} · #{item.playerB.tag_line}
                      </small>
                    </td>
                    <td>{item.games}</td>
                    <td>{item.wins}</td>
                    <td>{item.losses}</td>
                    <td>
                      <b>{item.winRate}%</b>
                    </td>
                    <td>{lastPlayed(item.lastPlayedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-panel">
            선택한 최소 경기 수를 만족하는 조합이 없습니다.
          </div>
        )}

        <div className="duo-disclaimer">
          Riot API는 실제 파티 구성 여부를 직접 제공하지 않습니다. 이 화면의
          ‘듀오’는 두 등록 플레이어가 같은 솔로랭크 경기에서 같은 팀으로
          확인된 기록이며, 우연히 같은 팀으로 매칭된 경기까지 포함될 수
          있습니다.
        </div>
      </section>
    </section>
  );
}
