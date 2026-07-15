import { useEffect, useRef, useState } from "react";
import { adminHeaders, api } from "../lib/api";

function timeLabel(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit", minute: "2-digit"
  }).format(new Date(value));
}

export default function ChatPanel({
  initialMessages, user, adminMode, adminPassword, onNeedLogin
}) {
  const [messages, setMessages] = useState(initialMessages || []);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);

  useEffect(() => setMessages(initialMessages || []), [initialMessages]);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      try {
        const payload = await api("/api/chat");
        setMessages(payload.messages);
      } catch {}
    }, 8000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  async function submit(event) {
    event.preventDefault();
    if (!user) {
      onNeedLogin();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload = await api("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message })
      });
      setMessages((current) => [...current, payload.message]);
      setMessage("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(messageId) {
    if (!adminPassword) return;
    try {
      await api("/api/chat", {
        method: "DELETE",
        headers: adminHeaders(adminPassword),
        body: JSON.stringify({ messageId })
      });
      setMessages((current) =>
        current.filter((item) => item.id !== messageId));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="chat-panel">
      <div className="panel-heading">
        <div><div className="eyebrow">CLUB CHAT</div><h2>한마디</h2></div>
        <span>최근 30개 · 10초 쿨다운</span>
      </div>

      <div className="chat-list" ref={listRef}>
        {!messages.length && <div className="empty-copy">첫 메시지를 남겨보세요.</div>}
        {messages.map((item) => (
          <div className="chat-message" key={item.id}>
            <div>
              <strong>{item.user?.nickname || "친구"}</strong>
              <span>{timeLabel(item.created_at)}</span>
            </div>
            <p>{item.message}</p>
            {adminMode && <button onClick={() => remove(item.id)}>삭제</button>}
          </div>
        ))}
      </div>

      <form className="chat-form" onSubmit={submit}>
        <input value={message} maxLength={100}
          placeholder={user
            ? `${user.nickname}(으)로 메시지 작성`
            : "로그인 후 메시지를 남길 수 있습니다"}
          onChange={(event) => setMessage(event.target.value)} />
        <button disabled={busy || !message.trim()}>
          {busy ? "전송 중" : "전송"}
        </button>
      </form>
      {error && <div className="form-error compact">{error}</div>}
    </section>
  );
}
