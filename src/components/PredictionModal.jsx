import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { scoreToRankLabel } from "../lib/rank";
import {
  ALLOWED_PREDICTION_OFFSETS,
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
  const [offset, setOffset] = useState(20);
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
    setOffset(20);
    setDirection("over");
    setError("");
  }, [open, initialPlayer, players]);

  const player = players.find((item) => item.id === playerId);
  const targetScore = useMemo(
    () =>
      Math.max(
        0,
        Math.min(5000, Number(player?.rank_score || 0) + Number(offset))
      ),
    [player, offset]
  );
  const reward = predictionReward(direction, offset);

  if (!open) return null;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = await api("/api/predictions", {
        method: "POST",
        body: JSON.stringify({ playerId, direction, scoreDelta: offset })
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
        <h2>48시간 뒤 랭크 예측</h2>
        <p className="modal-copy">
          참가 비용과 오답 손실은 없습니다. 현재 점수에서 목표 변동폭을
          정하고, 어려운 방향을 선택할수록 정답 보상이 커집니다.
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
              value={offset}
              onChange={(event) => setOffset(Number(event.target.value))}
            >
              {ALLOWED_PREDICTION_OFFSETS.map((item) => (
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
              현재 {scoreToRankLabel(player?.rank_score || 0)} → {offset > 0 ? "+" : ""}
              {offset}점
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
            <small>오답이어도 보유 오크크는 줄지 않습니다.</small>
          </div>

          {error && <div className="form-error">{error}</div>}
          <button className="primary-button" disabled={busy || !playerId}>
            {busy ? "등록 중" : "오늘의 예측 확정"}
          </button>
        </form>
      </section>
    </div>
  );
}
