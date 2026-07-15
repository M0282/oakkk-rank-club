import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import AuthModal from "./components/AuthModal";
import ChatPanel from "./components/ChatPanel";
import DuoBoard from "./components/DuoBoard";
import HeroCard from "./components/HeroCard";
import PlayerCard from "./components/PlayerCard";
import PredictionModal from "./components/PredictionModal";
import { adminHeaders, api, setToken } from "./lib/api";
import "./styles.css";

const PAGE_LABELS = {
  1: "랭크 보드",
  2: "듀오 통계",
  3: "커뮤니티"
};

function App() {
  const [dashboard, setDashboard] = useState(null);
  const [user, setUser] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [predictionOpen, setPredictionOpen] = useState(false);
  const [predictionPlayer, setPredictionPlayer] = useState(null);
  const [riotId, setRiotId] = useState("");
  const [adding, setAdding] = useState(false);
  const [adminPassword, setAdminPassword] = useState(
    sessionStorage.getItem("oakkk_admin") || ""
  );

  const adminMode = Boolean(adminPassword);

  async function load(force = false) {
    force ? setRefreshing(true) : setLoading(true);
    setError("");

    try {
      const payload = await api(`/api/dashboard${force ? "?force=1" : ""}`);
      setDashboard(payload);
      setUser(payload.me || null);
    } catch (err) {
      if (err.status === 401) {
        setToken("");
        setUser(null);
      }
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load(false), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const sortedPlayers = useMemo(
    () =>
      [...(dashboard?.players || [])].sort(
        (a, b) => Number(b.rank_score || -1) - Number(a.rank_score || -1)
      ),
    [dashboard]
  );

  const todayPrediction = dashboard?.myPredictions?.find((item) => {
    const format = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul"
    });
    return format.format(new Date(item.created_at)) === format.format(new Date());
  });

  function needLogin() {
    setAuthOpen(true);
  }

  function openPrediction(player = null) {
    if (!user) {
      needLogin();
      return;
    }
    setPredictionPlayer(player);
    setPredictionOpen(true);
  }

  async function addPlayer(event) {
    event.preventDefault();
    if (!user) {
      needLogin();
      return;
    }

    setAdding(true);
    setNotice("");
    setError("");

    try {
      const payload = await api("/api/players", {
        method: "POST",
        body: JSON.stringify({ riotId })
      });
      setRiotId("");
      setNotice(
        `${payload.player.game_name}#${payload.player.tag_line} 계정을 추가했습니다.`
      );
      await load(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function deletePlayer(playerId) {
    if (!adminPassword) return;
    if (!confirm("이 친구를 목록에서 삭제할까요?")) return;

    try {
      await api("/api/players", {
        method: "DELETE",
        headers: adminHeaders(adminPassword),
        body: JSON.stringify({ playerId })
      });
      await load(false);
    } catch (err) {
      setError(err.message);
    }
  }

  function toggleAdmin() {
    if (adminMode) {
      sessionStorage.removeItem("oakkk_admin");
      setAdminPassword("");
      return;
    }

    const password = window.prompt("관리자 비밀번호를 입력하세요.");
    if (!password) return;
    sessionStorage.setItem("oakkk_admin", password);
    setAdminPassword(password);
  }

  function logout() {
    setToken("");
    setUser(null);
    setNotice("로그아웃했습니다.");
    load(false);
  }

  return (
    <main className="page">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">OK</div>
          <div>
            <span>DISCORD SOLO QUEUE CLUB</span>
            <h1>오크크 랭크 클럽</h1>
          </div>
        </div>

        <div className="header-actions">
          <div className={`live-chip ${error ? "error" : ""}`}>
            <i />
            {refreshing ? "UPDATING" : error ? "ERROR" : "LIVE"}
          </div>

          {user ? (
            <div className="user-chip">
              <span>{user.nickname}</span>
              <strong>{user.oakkk} 오크크</strong>
            </div>
          ) : (
            <button onClick={() => setAuthOpen(true)}>로그인</button>
          )}

          <button onClick={() => load(true)} disabled={refreshing}>
            즉시 갱신
          </button>

          {user && <button onClick={logout}>로그아웃</button>}
        </div>
      </header>

      <nav className="page-tabs" aria-label="페이지 이동">
        {Object.entries(PAGE_LABELS).map(([number, label]) => (
          <button
            key={number}
            className={page === Number(number) ? "active" : ""}
            onClick={() => setPage(Number(number))}
          >
            <b>{String(number).padStart(2, "0")}</b>
            {label}
          </button>
        ))}
      </nav>

      <section className="market-strip">
        <div>
          <span>MEMBERS</span>
          <strong>{dashboard?.players?.length || 0} PLAYERS</strong>
        </div>
        <div>
          <span>SAME-TEAM PAIRS</span>
          <strong>{dashboard?.duoStats?.length || 0} RECORDED</strong>
        </div>
        <div>
          <span>PREDICTION REWARD</span>
          <strong>5 ~ 20 오크크</strong>
        </div>
        <div>
          <span>UPDATED</span>
          <strong>
            {dashboard
              ? new Intl.DateTimeFormat("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit"
                }).format(new Date(dashboard.updatedAt))
              : "--:--:--"}
          </strong>
        </div>
      </section>

      {(error || notice) && (
        <div className={error ? "alert error-alert" : "alert success-alert"}>
          {error || notice}
        </div>
      )}

      {page === 1 && (
        <>
          <section className="hero-grid">
            <HeroCard type="win" player={dashboard?.winKing} />
            <HeroCard type="loss" player={dashboard?.lossKing} />
          </section>

          <section className="control-card prediction-control standalone-prediction">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">OAKKK CHALLENGE</div>
                <h2>오늘의 무료 예측</h2>
              </div>
              <span>48시간 뒤 판정</span>
            </div>

            {todayPrediction ? (
              <div className="today-prediction">
                <span>오늘 참여 완료</span>
                <strong>
                  {todayPrediction.player?.game_name}#
                  {todayPrediction.player?.tag_line}
                </strong>
                <p>
                  {todayPrediction.target_label}{" "}
                  {todayPrediction.direction === "over" ? "이상" : "미만"} ·{" "}
                  {todayPrediction.status === "pending"
                    ? `판정 대기 · 정답 보상 ${todayPrediction.potential_reward} 오크크`
                    : todayPrediction.status === "won"
                      ? `정답 +${todayPrediction.reward} 오크크`
                      : "오답 · 차감 없음"}
                </p>
              </div>
            ) : (
              <>
                <button
                  className="primary-button"
                  onClick={() => openPrediction()}
                >
                  오늘의 예측 참여
                </button>
                <p>
                  참가 비용 0 · 오답 차감 0 · 난이도별 정답 보상 5~20 오크크
                </p>
              </>
            )}
          </section>

          <section className="friends-section rank-page-section">
            <div className="section-heading">
              <div>
                <div className="eyebrow">ALL FRIENDS</div>
                <h2>솔로 랭크 보드</h2>
                <p>
                  현재 LP와 최근 솔로랭크 최대 20경기 승률을 표시합니다.
                </p>
              </div>
              <button className="admin-button" onClick={toggleAdmin}>
                {adminMode ? "관리자 모드 종료" : "관리자 모드"}
              </button>
            </div>

            {loading && !dashboard ? (
              <div className="player-grid">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div className="skeleton-card" key={index} />
                ))}
              </div>
            ) : (
              <div className="player-grid">
                {sortedPlayers.map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    adminMode={adminMode}
                    onDelete={deletePlayer}
                    onPredict={openPrediction}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {page === 2 && (
        <DuoBoard
          duoStats={dashboard?.duoStats || []}
          bestDuo={dashboard?.bestDuo}
          worstDuo={dashboard?.worstDuo}
          coverage={dashboard?.duoCoverage}
        />
      )}

      {page === 3 && (
        <section className="community-layout">
          <ChatPanel
            initialMessages={dashboard?.messages || []}
            user={user}
            adminMode={adminMode}
            adminPassword={adminPassword}
            onNeedLogin={needLogin}
          />

          <section className="leaderboard-panel">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">OAKKK BOARD</div>
                <h2>활동 포인트</h2>
              </div>
            </div>

            <div className="point-list">
              {(dashboard?.pointLeaders || []).map((item, index) => (
                <div key={item.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item.nickname}</strong>
                  <b>{item.oakkk} 오크크</b>
                </div>
              ))}
            </div>

            <div className="currency-rules">
              <strong>오크크 이용 규칙</strong>
              <p>
                사이트 내부 무료 활동 포인트입니다. 구매·판매·양도·환전할
                수 없으며 블록체인이나 암호화폐와 관련이 없습니다.
              </p>
              <p>예측 참여와 오답에는 포인트가 차감되지 않습니다.</p>
            </div>
          </section>

          <details className="add-friend-bottom">
            <summary>
              <span>
                <b>친구 추가</b>
                <small>새 Riot ID를 등록할 때만 열어 주세요.</small>
              </span>
              <i>+</i>
            </summary>
            <article className="control-card">
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">ADD FRIEND</div>
                  <h2>Riot ID 등록</h2>
                </div>
                <span>최대 30명</span>
              </div>

              <form className="inline-form" onSubmit={addPlayer}>
                <input
                  value={riotId}
                  placeholder="게임이름#KR1"
                  onChange={(event) => setRiotId(event.target.value)}
                  required
                />
                <button disabled={adding}>
                  {adding ? "확인 중" : "친구 추가"}
                </button>
              </form>

              <p>
                로그인한 친구가 등록할 수 있으며 중복 Riot ID는 추가되지
                않습니다.
              </p>
            </article>
          </details>
        </section>
      )}

      <footer>
        <p>
          Oakkk Rank Club isn't endorsed by Riot Games and doesn't reflect the
          views or opinions of Riot Games or anyone officially involved in
          producing or managing Riot Games properties. Riot Games, and all
          associated properties are trademarks or registered trademarks of
          Riot Games, Inc.
        </p>
      </footer>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(nextUser) => {
          setUser(nextUser);
          load(false);
        }}
      />

      <PredictionModal
        open={predictionOpen}
        players={dashboard?.players || []}
        initialPlayer={predictionPlayer}
        onClose={() => {
          setPredictionOpen(false);
          setPredictionPlayer(null);
        }}
        onCreated={(payload) => {
          setNotice(payload.message);
          load(false);
        }}
      />
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
