import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { scoreToRankLabel } from "../lib/rank";
import {
  ALLOWED_SCORE_DELTAS,
  PREDICTION_DURATION_HOURS,
  predictionReward
} from "../../shared/prediction.js";

export default function PredictionModal({
  open,
  players,
  initialPlayer,
  onClose,
  onCreated
}) {
  const [playerId, setPlayerId] = useState("");
  const [scoreDelta, setScoreDelta] = useState(20);
  const [direction, setDirection] = useState("over");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setPlayerId(
      initialPlayer?.id ||
        players.find((player) =>
          Number.isFinite(Number(player.rank_score))
        )?.id ||
        ""
    );
    setScoreDelta(20);
    setDirection("over");
    setError("");
  }, [open, initialPlayer, players]);

  const player = players.find((item) => item.id === playerId);
  const targetScore = useMemo(
    () => Number(player?.rank_score || 0) + Number(scoreDelta),
    [player, scoreDelta]
  );
  const reward = predictionReward(scoreDelta);
  const targetIsValid = targetScore >= 0 && targetScore <= 5000;

  if (!open) return null;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = await api("/api/predictions", {
        method: "POST",
        body: JSON.stringify({ playerId, direction, scoreDelta })
      });
      onCreated(payload);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="modal prediction-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="닫기">
          ×
        </button>
        <div className="eyebrow">FREE DAILY CHALLENGE</div>
        <h2>{PREDICTION_DURATION_HOURS}시간 뒤 랭크 예측</h2>
        <p className="modal-copy">
          참가 비용과 오답 손실은 없습니다. 현재 점수에서 선택한 변동폭의
          절대값이 클수록 정답 보상이 커집니다. 이상·미만 방향은 보상에
          영향을 주지 않습니다.
        </p>

        <form className="stack-form" onSubmit={submit}>
          <label>
            예측 대상
            <select
              value={playerId}
              onChange={(event) => setPlayerId(event.target.value)}
              required
            >
              {players
                .filter((item) => Number.isFinite(Number(item.rank_score)))
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.game_name}#{item.tag_line}
                  </option>
                ))}
            </select>
          </label>

          <label>
            현재 점수에서 목표 조정
            <select
              value={scoreDelta}
              onChange={(event) => setScoreDelta(Number(event.target.value))}
            >
              {ALLOWED_SCORE_DELTAS.map((item) => (
                <option key={item} value={item}>
                  {item > 0 ? "+" : ""}
                  {item}점
                </option>
              ))}
            </select>
          </label>

          <div className="target-preview">
            <span>예측 기준</span>
            <strong>{scoreToRankLabel(targetScore)}</strong>
            <small>
              현재 {scoreToRankLabel(player?.rank_score || 0)} → {scoreDelta > 0 ? "+" : ""}
              {scoreDelta}점
            </small>
          </div>

          <div className="direction-grid">
            <button
              type="button"
              className={direction === "over" ? "selected" : ""}
              onClick={() => setDirection("over")}
            >
              이상이다
            </button>
            <button
              type="button"
              className={direction === "under" ? "selected" : ""}
              onClick={() => setDirection("under")}
            >
              미만이다
            </button>
          </div>

          <div className="reward-preview">
            <span>정답 보상</span>
            <strong>{reward} 오크크</strong>
            <small>
              |변동폭| 0점: 5 · 20점: 10 · 40점: 15 · 60점: 20 오크크
            </small>
            <small>오답이어도 보유 오크크는 줄지 않습니다.</small>
          </div>

          {!targetIsValid && (
            <div className="form-error">
              현재 점수에서는 선택한 변동폭을 적용할 수 없습니다.
            </div>
          )}
          {error && <div className="form-error">{error}</div>}
          <button
            className="primary-button"
            disabled={busy || !playerId || !targetIsValid}
          >
            {busy ? "등록 중" : "오늘의 예측 확정"}
          </button>
        </form>
      </section>
    </div>
  );
}
