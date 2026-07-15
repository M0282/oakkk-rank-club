import { useState } from "react";
import { api, setToken } from "../lib/api";

export default function AuthModal({ open, onClose, onSuccess }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    nickname: "", pin: "", inviteCode: ""
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const payload = await api("/api/auth", {
        method: "POST",
        body: JSON.stringify({ action: mode, ...form })
      });
      setToken(payload.token);
      onSuccess(payload.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal auth-modal"
        onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="닫기">×</button>
        <div className="eyebrow">MEMBER ACCESS</div>
        <h2>{mode === "login" ? "클럽 로그인" : "친구 계정 만들기"}</h2>
        <p className="modal-copy">
          랭크 보드는 누구나 볼 수 있고, 친구 추가·채팅·예측은 로그인 후
          사용할 수 있습니다.
        </p>

        <div className="auth-tabs">
          <button type="button" className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}>로그인</button>
          <button type="button" className={mode === "register" ? "active" : ""}
            onClick={() => setMode("register")}>가입</button>
        </div>

        <form onSubmit={submit} className="stack-form">
          <label>
            사이트 닉네임
            <input value={form.nickname} maxLength={16}
              onChange={(event) =>
                setForm({ ...form, nickname: event.target.value })}
              required />
          </label>
          <label>
            PIN
            <input type="password" value={form.pin}
              minLength={4} maxLength={20}
              onChange={(event) =>
                setForm({ ...form, pin: event.target.value })}
              required />
          </label>
          {mode === "register" && (
            <label>
              디스코드 초대 코드
              <input type="password" value={form.inviteCode}
                onChange={(event) =>
                  setForm({ ...form, inviteCode: event.target.value })}
                required />
            </label>
          )}
          {error && <div className="form-error">{error}</div>}
          <button className="primary-button" disabled={busy}>
            {busy ? "처리 중" :
              mode === "login" ? "로그인" : "가입하고 50 오크크 받기"}
          </button>
        </form>
      </section>
    </div>
  );
}
