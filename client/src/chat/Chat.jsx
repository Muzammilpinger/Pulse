import React, { useEffect, useRef, useState } from "react";
import { connectWebSocket } from "./websocket";
import Call from "../call/Call";
const channels = [
  [
    "general",
    "The place for everything. Say hello, share an idea, stay in the loop.",
  ],
  [
    "engineering",
    "Build notes, technical decisions, and the details that matter.",
  ],
  ["random", "A little room for everything else."],
];
const Mark = () => (
  <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path
      d="M3 17h6l4-10 6 19 4-12 3 3h3"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const initials = (name) => name.slice(0, 2).toUpperCase();
function Avatar({ name }) {
  return (
    <span
      className={`avatar color-${[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % 4}`}
    >
      {initials(name)}
    </span>
  );
}
export default function Chat() {
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("pulse-session"));
    } catch {
      return null;
    }
  });
  const [name, setName] = useState(""),
    [room, setRoom] = useState("general"),
    [messages, setMessages] = useState([]),
    [input, setInput] = useState(""),
    [status, setStatus] = useState("Connecting"),
    [users, setUsers] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [voice, setVoice] = useState(false),
    [search, setSearch] = useState(""),
    [info, setInfo] = useState(false),
    [menu, setMenu] = useState(false),
    [instance, setInstance] = useState(""),
    [older, setOlder] = useState(true);
  const socket = useRef(null),
    end = useRef(null),
    scroll = useRef(true);
  async function join(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name }),
      });
      if (!res.ok)
        throw Error("Use 2–24 letters, numbers, underscores, or hyphens.");
      const data = await res.json();
      sessionStorage.setItem("pulse-session", JSON.stringify(data));
      setSession(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function logout() {
    sessionStorage.removeItem("pulse-session");
    setSession(null);
    setVoice(false);
    setError("");
  }
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const controller = new AbortController();
    setMessages([]);
    setUsers([]);
    setError("");
    setOlder(true);
    scroll.current = true;
    async function history() {
      try {
        const res = await fetch(`/api/rooms/${room}/messages`, {
          headers: { Authorization: `Bearer ${session.token}` },
          signal: controller.signal,
        });
        if (!res.ok)
          throw Error(
            res.status === 401
              ? "Session expired. Leave and join again."
              : "Could not load history.",
          );
        const rows = await res.json();
        if (!cancelled) {
          setMessages((current) =>
            [
              ...new Map([...rows, ...current].map((m) => [m.id, m])).values(),
            ].sort((a, b) => a.id - b.id),
          );
          setOlder(rows.length === 50);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    }
    socket.current = connectWebSocket(
      room,
      session.token,
      (event) => {
        if (cancelled) return;
        if (event.type === "message") {
          scroll.current = true;
          setMessages((current) =>
            current.some((m) => m.id === event.id)
              ? current
              : [...current, event],
          );
        }
        if (event.type === "presence_list") setUsers(event.users);
        if (event.type === "error") setError(event.message);
      },
      (s) => {
        if (!cancelled) setStatus(s);
      },
      (data) => {
        if (!cancelled) {
          setInstance(data.instance);
          history();
        }
      },
    );
    return () => {
      cancelled = true;
      controller.abort();
      socket.current?.close();
    };
  }, [session, room]);
  useEffect(() => {
    if (scroll.current) end.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  async function loadOlder() {
    if (!messages.length) return;
    scroll.current = false;
    try {
      const res = await fetch(
        `/api/rooms/${room}/messages?before=${messages[0].id}`,
        { headers: { Authorization: `Bearer ${session.token}` } },
      );
      if (!res.ok) throw Error("Could not load older messages.");
      const rows = await res.json();
      setMessages((current) => [
        ...new Map([...rows, ...current].map((m) => [m.id, m])).values(),
      ]);
      setOlder(rows.length === 50);
    } catch (e) {
      setError(e.message);
    }
  }
  function send(e) {
    e.preventDefault();
    if (!input.trim()) return;
    if (socket.current?.send(input.trim())) {
      setInput("");
      setError("");
    } else setError("Reconnecting. Your draft is still here.");
  }
  if (!session)
    return (
      <main className="welcome">
        <div className="welcome-top">
          <a className="brand" href="/">
            <span className="logo">
              <Mark />
            </span>
            pulse<span className="brand-dot">.</span>
          </a>
          <span className="eyebrow">A LITTLE CLOSER, IN REAL TIME</span>
          <a href="https://github.com/Muzammilpinger/Pulse">
            View the source ↗
          </a>
        </div>
        <div className="welcome-grid">
          <section className="welcome-story">
            <div className="eyebrow">
              <span className="dot" /> BUILT FOR THE CONVERSATION
            </div>
            <h1>
              Good ideas
              <br />
              need a place
              <br />
              to <em>connect.</em>
            </h1>
            <p>
              A quiet space for fast conversations.
              <br />
              Open a channel, find your people, and keep
              <br />
              the momentum going.
            </p>
            <div className="story-bottom">
              <span className="mini-wave">
                <Mark />
              </span>
              <span>
                Real-time messaging. Human connection.
                <br />
                <small>An open-source engineering project by Muzammil.</small>
              </span>
            </div>
          </section>
          <section className="join-card">
            <span className="tag">YOUR NEXT CONVERSATION STARTS HERE</span>
            <h2>
              Make yourself
              <br />
              at home.
            </h2>
            <p>Choose a name and step into the workspace.</p>
            <form onSubmit={join}>
              <label htmlFor="username">Display name</label>
              <input
                id="username"
                autoComplete="nickname"
                placeholder="e.g. muzammil"
                value={name}
                onChange={(e) => setName(e.target.value)}
                pattern={"[a-zA-Z0-9_\\-]{2,24}"}
                minLength={2}
                maxLength={24}
                required
              />
              <small>2–24 characters. Letters, numbers, _ or -.</small>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button className="primary" disabled={busy}>
                {busy ? "Opening workspace…" : "Enter workspace"} <span>↗</span>
              </button>
            </form>
            <div className="join-note">
              <span className="dot" /> Guest access · No account needed
            </div>
            <p className="privacy">
              This is a public portfolio demo. Display names are unverified, and
              messages are visible to everyone in the room.
            </p>
          </section>
        </div>
        <footer className="welcome-footer">
          <span>INDEPENDENTLY BUILT. OPEN BY DESIGN.</span>
          <span>React / FastAPI / Redis / PostgreSQL</span>
          <span>01 — CONNECT</span>
        </footer>
      </main>
    );
  const filtered = messages.filter((m) =>
    `${m.sender_id} ${m.content}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <main className="workspace">
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <a className="brand" href="/">
          <span className="logo">
            <Mark />
          </span>
          pulse<span className="brand-dot">.</span>
          <span className="tag">WORKSPACE</span>
        </a>
        <div className="workspace-name">
          <span className="workspace-icon">P</span>
          <div>
            Pulse community<small>A space to build together</small>
          </div>
          <span>⌄</span>
        </div>
        <div className="sidebar-label">
          YOUR CHANNELS <span>03</span>
        </div>
        <nav aria-label="Channels">
          {channels.map(([id]) => (
            <button
              key={id}
              className={`channel ${room === id ? "active" : ""}`}
              onClick={() => {
                setRoom(id);
                setVoice(false);
                setSearch("");
                setMenu(false);
              }}
            >
              <span className="hash">#</span>
              {id}
              {room === id && <span className="channel-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-label">VOICE SPACE</div>
        <button
          className={`channel ${voice ? "active" : ""}`}
          onClick={() => {
            setVoice(!voice);
            setMenu(false);
          }}
        >
          <span>♧</span> The lounge <span className="tag">1:1</span>
        </button>
        <div className="sidebar-card">
          <span className="eyebrow">SMALL SPACE. BIG IDEAS.</span>
          <h3>
            Keep the
            <br />
            conversation flowing.
          </h3>
          <p>Your next good idea might start with a hello.</p>
          <Mark />
        </div>
        <div className="profile">
          <Avatar name={session.username} />
          <div>
            <strong>{session.username}</strong>
            <small>
              <span
                className={`dot ${status !== "Connected" ? "offline" : ""}`}
              />
              {status}
            </small>
          </div>
          <button
            className="icon-button"
            aria-label="Leave workspace"
            title="Leave workspace"
            onClick={logout}
          >
            ↪
          </button>
        </div>
      </aside>
      <section className="conversation">
        <header className="chat-header">
          <button
            className="mobile-menu icon-button"
            onClick={() => setMenu(!menu)}
            aria-label="Toggle channels"
          >
            ☰
          </button>
          <span className="header-hash">#</span>
          <div>
            <h1>{room}</h1>
            <p>{channels.find(([id]) => id === room)[1]}</p>
          </div>
          <div className="header-actions">
            <button className="subtle" onClick={() => setVoice(!voice)}>
              ♧ <span>Join voice</span>
            </button>
            <button
              className={`icon-button ${info ? "selected" : ""}`}
              aria-label="Channel details"
              onClick={() => setInfo(!info)}
            >
              ⓘ
            </button>
          </div>
        </header>
        <div className="channel-banner">
          <span>
            <span
              className={`dot ${status !== "Connected" ? "offline" : ""}`}
            />
            {status === "Connected"
              ? "You’re all caught up with your people."
              : status === "Session expired"
                ? "Your session expired. Leave and join again."
                : "Reconnecting — your draft stays safe."}
          </span>
          <span className="banner-label">{users.length} ONLINE</span>
        </div>
        {voice && (
          <Call
            key={room}
            room={room}
            token={session.token}
            onClose={() => setVoice(false)}
          />
        )}
        <div className="conversation-body">
          <div className="chat-main">
            <div className="messages" aria-label="Messages" role="log">
              <div className="channel-intro">
                <div className="intro-icon">#</div>
                <span className="eyebrow">
                  A SHARED SPACE FOR GOOD CONVERSATIONS
                </span>
                <h2>
                  Welcome to <span>#{room}.</span>
                </h2>
                <p>{channels.find(([id]) => id === room)[1]}</p>
              </div>
              <div className="date-divider">
                <span>THE CONVERSATION STARTS HERE</span>
              </div>
              {older && messages.length > 0 && (
                <button className="load-older" onClick={loadOlder}>
                  Load earlier messages
                </button>
              )}
              {filtered.map((m) => (
                <article className="message" key={m.id}>
                  <Avatar name={m.sender_id} />
                  <div>
                    <div className="message-meta">
                      <strong>{m.sender_id}</strong>
                      {m.sender_id === session.username && (
                        <span className="you-tag">YOU</span>
                      )}
                      <time dateTime={m.created_at}>
                        {new Date(m.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                    <p>{m.content}</p>
                  </div>
                </article>
              ))}
              {search && !filtered.length && (
                <p className="empty-search">No messages match “{search}”.</p>
              )}
              <div ref={end} />
            </div>
            <div className="composer-area">
              {error && (
                <div className="error" role="alert">
                  {error}
                  <button
                    aria-label="Dismiss error"
                    onClick={() => setError("")}
                  >
                    ×
                  </button>
                </div>
              )}
              <form className="composer" onSubmit={send}>
                <label className="sr-only" htmlFor="message">
                  Message {room}
                </label>
                <textarea
                  id="message"
                  placeholder={`Message #${room}…`}
                  value={input}
                  maxLength={4000}
                  rows={2}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(e);
                    }
                  }}
                />
                <div className="composer-bottom">
                  <span>
                    Make it a conversation.{" "}
                    <span className="composer-extra">Say something good.</span>
                  </span>
                  <button
                    className="send-button"
                    disabled={!input.trim() || status !== "Connected"}
                    aria-label="Send message"
                  >
                    Send <span>↗</span>
                  </button>
                </div>
              </form>
              <div className="composer-foot">
                <span>
                  <kbd>↵</kbd> to send · <kbd>shift ↵</kbd> for a new line
                </span>
                <span>{input.length}/4000</span>
              </div>
            </div>
          </div>
          <aside className={`details ${info ? "show" : ""}`}>
            <label className="search-box">
              <span>⌕</span>
              <input
                aria-label="Search loaded messages"
                placeholder="Search conversation"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <div className="sidebar-label">
              IN THIS CHANNEL{" "}
              <span>{users.length.toString().padStart(2, "0")}</span>
            </div>
            {users.map((user) => (
              <div className="member" key={user}>
                <Avatar name={user} />
                <div>
                  <strong>{user}</strong>
                  <small>
                    {user === session.username
                      ? "That’s you"
                      : "In the conversation"}
                  </small>
                </div>
                <span className="dot" />
              </div>
            ))}
            <div className="channel-about">
              <span className="eyebrow">ABOUT THIS SPACE</span>
              <h3>A little context.</h3>
              <p>
                Open conversations, shared ideas, and the occasional rabbit
                hole. Everyone is welcome here.
              </p>
              <div>
                <span>VISIBILITY</span>
                <strong>Public channel</strong>
              </div>
              <div>
                <span>CONNECTION</span>
                <strong>{status}</strong>
              </div>
              <div>
                <span>GATEWAY</span>
                <code>{instance || "Connecting…"}</code>
              </div>
            </div>
            <a
              className="source-link"
              href="https://github.com/Muzammilpinger/Pulse"
            >
              Made with curiosity.
              <br />
              <strong>Explore the engineering ↗</strong>
            </a>
          </aside>
        </div>
      </section>
    </main>
  );
}
