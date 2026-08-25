import React, { useEffect, useRef, useState } from "react";
import { connectWebSocket } from "./websocket";

const API_URL = "http://127.0.0.1:8001";

export default function Chat() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("offline");
  const [onlineUsers, setOnlineUsers] = useState([]);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // ======================================================
  // GLOBAL PAGE FIX
  // ======================================================

  useEffect(() => {
    const previous = {
      margin: document.body.style.margin,
      padding: document.body.style.padding,
      background: document.body.style.background,
      overflow: document.body.style.overflow,
    };

    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.background = "#05070d";
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.margin = previous.margin;
      document.body.style.padding = previous.padding;
      document.body.style.background = previous.background;
      document.body.style.overflow = previous.overflow;
    };
  }, []);

  // ======================================================
  // AUTO SCROLL
  // ======================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // ======================================================
  // JOIN ROOM
  // ======================================================

  async function joinRoom() {
    if (!username.trim() || !room.trim()) {
      return;
    }

    const roomId = room.trim();
    const userId = username.trim();

    try {
      const url =
        API_URL +
        "/rooms/" +
        encodeURIComponent(roomId) +
        "/messages";

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("History request failed");
      }

      const history = await response.json();

      setMessages(history);
      setRoom(roomId);
      setUsername(userId);
      setJoined(true);

      socketRef.current = connectWebSocket(
        roomId,
        userId,

        // Message received
        function (message) {
          setMessages((current) => [
            ...current,
            {
              id: crypto.randomUUID(),
              room_id: message.room_id,
              sender_id: message.sender_id,
              content: message.content,
            },
          ]);
        },

        // Connection status
        function (newStatus) {
          setStatus(newStatus);
        },

        // Presence
        function (event) {
          if (event.type === "presence_list") {
            setOnlineUsers(event.users);
            return;
          }

          if (event.type === "presence") {
            setOnlineUsers((current) => {
              if (event.status === "online") {
                if (current.includes(event.user_id)) {
                  return current;
                }

                return [...current, event.user_id];
              }

              return current.filter(
                (user) => user !== event.user_id
              );
            });
          }
        }
      );
    } catch (error) {
      console.error("❌ Failed to join room:", error);
    }
  }

  // ======================================================
  // SEND MESSAGE
  // ======================================================

  function sendMessage(event) {
    event.preventDefault();

    const content = input.trim();

    if (!content) {
      return;
    }

    if (
      !socketRef.current ||
      socketRef.current.readyState !== WebSocket.OPEN
    ) {
      console.error("❌ WebSocket is not connected");
      return;
    }

    socketRef.current.send(content);
    setInput("");
  }

  // ======================================================
  // CLEANUP
  // ======================================================

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  // ======================================================
  // LOGIN
  // ======================================================

  if (!joined) {
    return (
      <div style={styles.page}>
        <div style={styles.loginGlow} />
        <div style={styles.loginGlowTwo} />

        <div style={styles.loginCard}>
          <div style={styles.logo}>
            <span>P</span>
          </div>

          <div style={styles.loginTitle}>
            Welcome to Pulse
          </div>

          <div style={styles.loginSubtitle}>
            Real-time communication,
            <br />
            built from scratch.
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              USERNAME
            </label>

            <input
              style={styles.input}
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              placeholder="e.g. Muzzi"
              autoComplete="off"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              ROOM
            </label>

            <input
              style={styles.input}
              value={room}
              onChange={(event) =>
                setRoom(event.target.value)
              }
              placeholder="e.g. gaming"
              autoComplete="off"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  joinRoom();
                }
              }}
            />
          </div>

          <button
            style={styles.joinButton}
            onClick={joinRoom}
          >
            <span>Enter Pulse</span>
            <span style={styles.arrow}>→</span>
          </button>

          <div style={styles.loginFooter}>
            <span style={styles.liveDot} />
            System operational
          </div>
        </div>
      </div>
    );
  }

  // ======================================================
  // CHAT
  // ======================================================

  return (
    <div style={styles.page}>
      <div style={styles.app}>
        {/* SIDEBAR */}

        <aside style={styles.sidebar}>
          <div style={styles.brand}>
            <div style={styles.smallLogo}>P</div>

            <div>
              <div style={styles.brandName}>
                Pulse
              </div>

              <div style={styles.brandVersion}>
                REALTIME
              </div>
            </div>
          </div>

          <div style={styles.sidebarSection}>
            <div style={styles.sectionLabel}>
              CHANNEL
            </div>

            <div style={styles.activeRoom}>
              <span style={styles.hash}>#</span>
              <span>{room}</span>

              <span style={styles.roomLive}>
                ●
              </span>
            </div>
          </div>

          <div style={styles.sidebarSection}>
            <div style={styles.sectionLabel}>
              ONLINE

              <span style={styles.onlineCount}>
                {onlineUsers.length}
              </span>
            </div>

            <div style={styles.userList}>
              {onlineUsers.map((user) => (
                <div
                  key={user}
                  style={styles.user}
                >
                  <div style={styles.avatar}>
                    {user.charAt(0).toUpperCase()}
                  </div>

                  <div style={styles.userInfo}>
                    <span style={styles.userName}>
                      {user}
                    </span>

                    {user === username && (
                      <span style={styles.you}>
                        you
                      </span>
                    )}
                  </div>

                  <span style={styles.userOnline} />
                </div>
              ))}

              {onlineUsers.length === 0 && (
                <div style={styles.noUsers}>
                  Nobody is online
                </div>
              )}
            </div>
          </div>

          <div style={styles.sidebarBottom}>
            <div style={styles.currentUser}>
              <div style={styles.avatarLarge}>
                {username.charAt(0).toUpperCase()}
              </div>

              <div style={styles.currentUserInfo}>
                <strong>{username}</strong>

                <span>
                  <span
                    style={{
                      ...styles.statusDot,
                      background:
                        status === "online"
                          ? "#54e58a"
                          : "#ff6262",
                    }}
                  />

                  {status === "online"
                    ? "Online"
                    : "Offline"}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* CHAT */}

        <section style={styles.chat}>
          <header style={styles.header}>
            <div style={styles.headerLeft}>
              <div style={styles.channelIcon}>
                #
              </div>

              <div>
                <div style={styles.channelName}>
                  {room}
                </div>

                <div style={styles.channelDescription}>
                  {onlineUsers.length}{" "}
                  {onlineUsers.length === 1
                    ? "person"
                    : "people"}{" "}
                  online
                </div>
              </div>
            </div>

            <div style={styles.liveStatus}>
              <span
                style={{
                  ...styles.statusDot,
                  background:
                    status === "online"
                      ? "#54e58a"
                      : "#ff6262",
                  boxShadow:
                    status === "online"
                      ? "0 0 10px rgba(84,229,138,.7)"
                      : "0 0 10px rgba(255,98,98,.7)",
                }}
              />

              {status === "online"
                ? "Connected"
                : "Disconnected"}
            </div>
          </header>

          {/* MESSAGES */}

          <div
            style={styles.messages}
            className="pulse-messages"
          >
            {messages.length === 0 ? (
              <div style={styles.empty}>
                <div style={styles.emptyIcon}>
                  #
                </div>

                <div style={styles.emptyTitle}>
                  Welcome to #{room}
                </div>

                <div style={styles.emptyText}>
                  This is the beginning of the
                  conversation.
                </div>
              </div>
            ) : (
              messages.map((message) => {
                const isMe =
                  message.sender_id === username;

                return (
                  <div
                    key={message.id}
                    style={{
                      ...styles.messageRow,
                      justifyContent: isMe
                        ? "flex-end"
                        : "flex-start",
                    }}
                  >
                    {!isMe && (
                      <div
                        style={styles.messageAvatar}
                      >
                        {message.sender_id
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}

                    <div
                      style={{
                        ...styles.messageGroup,
                        alignItems: isMe
                          ? "flex-end"
                          : "flex-start",
                      }}
                    >
                      <div style={styles.messageMeta}>
                        {isMe
                          ? "You"
                          : message.sender_id}
                      </div>

                      <div
                        style={{
                          ...styles.bubble,
                          ...(isMe
                            ? styles.myBubble
                            : styles.otherBubble),
                        }}
                      >
                        {message.content}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* COMPOSER */}

          <form
            onSubmit={sendMessage}
            style={styles.composer}
          >
            <div style={styles.inputWrapper}>
              <input
                style={styles.messageInput}
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                placeholder={
                  status === "online"
                    ? `Message #${room}`
                    : "Connecting to Pulse..."
                }
                disabled={status !== "online"}
              />

              <button
                type="submit"
                style={{
                  ...styles.sendButton,
                  opacity:
                    status === "online" &&
                    input.trim()
                      ? 1
                      : 0.45,
                }}
                disabled={
                  status !== "online" ||
                  !input.trim()
                }
              >
                ↑
              </button>
            </div>

            <div style={styles.composerHint}>
              Press{" "}
              <kbd style={styles.kbd}>Enter</kbd>{" "}
              to send
            </div>
          </form>
        </section>
      </div>

      <style>{`
        .pulse-messages::-webkit-scrollbar {
          width: 5px;
        }

        .pulse-messages::-webkit-scrollbar-track {
          background: transparent;
        }

        .pulse-messages::-webkit-scrollbar-thumb {
          background: rgba(128,101,255,.18);
          border-radius: 999px;
        }

        .pulse-messages::-webkit-scrollbar-thumb:hover {
          background: rgba(128,101,255,.35);
        }

        input::placeholder {
          color: #505a71;
        }

        button {
          font-family: inherit;
        }

        * {
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
}

// ======================================================
// STYLES
// ======================================================

const styles = {
  page: {
    position: "fixed",
    inset: 0,
    width: "100vw",
    height: "100vh",
    background:
      "radial-gradient(circle at 50% -10%, #202c52 0%, #0b1020 38%, #05070d 78%)",
    color: "#f5f7ff",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  loginGlow: {
    position: "absolute",
    width: "600px",
    height: "600px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(108,84,255,.18), transparent 70%)",
    filter: "blur(35px)",
    pointerEvents: "none",
  },

  loginGlowTwo: {
    position: "absolute",
    width: "350px",
    height: "350px",
    right: "-100px",
    bottom: "-100px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(75,188,255,.10), transparent 70%)",
    filter: "blur(35px)",
    pointerEvents: "none",
  },

  loginCard: {
    width: "370px",
    padding: "42px",
    borderRadius: "26px",
    background: "rgba(10, 14, 26, 0.88)",
    backdropFilter: "blur(25px)",
    border: "1px solid rgba(255,255,255,.045)",
    boxShadow:
      "0 35px 100px rgba(0,0,0,.55), 0 0 80px rgba(93,78,230,.08)",
    textAlign: "center",
    position: "relative",
    zIndex: 1,
  },

  logo: {
    width: "68px",
    height: "68px",
    margin: "0 auto 22px",
    borderRadius: "19px",
    display: "grid",
    placeItems: "center",
    background:
      "linear-gradient(135deg, #8065ff, #4bbcff)",
    boxShadow:
      "0 12px 35px rgba(105,83,255,.35)",
    fontSize: "29px",
    fontWeight: "900",
  },

  loginTitle: {
    fontSize: "29px",
    fontWeight: "800",
    letterSpacing: "-.7px",
  },

  loginSubtitle: {
    color: "#737d96",
    fontSize: "13px",
    lineHeight: "1.6",
    margin: "10px 0 30px",
  },

  formGroup: {
    textAlign: "left",
    marginBottom: "15px",
  },

  label: {
    display: "block",
    color: "#68738c",
    fontSize: "9px",
    fontWeight: "800",
    letterSpacing: "1.5px",
    margin: "0 0 7px 3px",
  },

  input: {
    width: "100%",
    padding: "13px 14px",
    borderRadius: "11px",
    border: "1px solid rgba(255,255,255,.07)",
    background: "rgba(255,255,255,.035)",
    color: "#fff",
    outline: "none",
    fontSize: "14px",
  },

  joinButton: {
    width: "100%",
    border: "none",
    borderRadius: "12px",
    padding: "14px",
    marginTop: "8px",
    background:
      "linear-gradient(135deg, #8065ff, #4baeff)",
    color: "#fff",
    fontWeight: "750",
    fontSize: "14px",
    cursor: "pointer",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "12px",
    boxShadow:
      "0 10px 30px rgba(93,78,230,.25)",
  },

  arrow: {
    fontSize: "18px",
  },

  loginFooter: {
    marginTop: "25px",
    fontSize: "11px",
    color: "#59637a",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "7px",
  },

  liveDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#54e58a",
    boxShadow:
      "0 0 8px rgba(84,229,138,.7)",
  },

  app: {
    width: "calc(100vw - 48px)",
    maxWidth: "1180px",
    height: "min(780px, calc(100vh - 48px))",
    display: "flex",
    overflow: "hidden",
    borderRadius: "24px",
    background: "rgba(9, 13, 24, .96)",
    border: "1px solid rgba(255,255,255,.035)",
    boxShadow: "0 40px 120px rgba(0,0,0,.6)",
  },

  sidebar: {
    width: "255px",
    flexShrink: 0,
    background: "rgba(255,255,255,.018)",
    padding: "22px 15px",
    position: "relative",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    padding: "0 8px",
    marginBottom: "35px",
  },

  smallLogo: {
    width: "35px",
    height: "35px",
    borderRadius: "10px",
    display: "grid",
    placeItems: "center",
    background:
      "linear-gradient(135deg,#8065ff,#4bbcff)",
    fontWeight: "900",
    boxShadow:
      "0 7px 20px rgba(100,80,240,.25)",
  },

  brandName: {
    fontWeight: "800",
    fontSize: "17px",
  },

  brandVersion: {
    fontSize: "8px",
    color: "#59637a",
    letterSpacing: "1.5px",
    marginTop: "2px",
  },

  sidebarSection: {
    marginBottom: "27px",
  },

  sectionLabel: {
    color: "#59647c",
    fontSize: "9px",
    fontWeight: "800",
    letterSpacing: "1.4px",
    padding: "0 9px",
    marginBottom: "9px",
    display: "flex",
    justifyContent: "space-between",
  },

  onlineCount: {
    color: "#54e58a",
  },

  activeRoom: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 11px",
    borderRadius: "10px",
    background:
      "linear-gradient(90deg, rgba(128,101,255,.14), rgba(128,101,255,.04))",
    color: "#c8c0ff",
    fontSize: "13px",
    fontWeight: "650",
  },

  hash: {
    color: "#8065ff",
    fontSize: "17px",
  },

  roomLive: {
    marginLeft: "auto",
    color: "#54e58a",
    fontSize: "7px",
    textShadow:
      "0 0 8px rgba(84,229,138,.7)",
  },

  userList: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },

  user: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    padding: "7px",
    borderRadius: "9px",
  },

  avatar: {
    width: "30px",
    height: "30px",
    flexShrink: 0,
    borderRadius: "9px",
    background:
      "linear-gradient(135deg,#263252,#171d2e)",
    display: "grid",
    placeItems: "center",
    color: "#b9c1d5",
    fontSize: "11px",
    fontWeight: "750",
  },

  userInfo: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
  },

  userName: {
    color: "#b9c1d1",
    fontSize: "13px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  you: {
    color: "#69738b",
    fontSize: "9px",
  },

  userOnline: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "#54e58a",
    marginLeft: "auto",
    boxShadow:
      "0 0 9px rgba(84,229,138,.65)",
  },

  noUsers: {
    padding: "8px",
    color: "#505a71",
    fontSize: "11px",
  },

  sidebarBottom: {
    position: "absolute",
    bottom: "17px",
    left: "15px",
    right: "15px",
    paddingTop: "15px",
  },

  currentUser: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px",
    borderRadius: "12px",
    background: "rgba(255,255,255,.025)",
  },

  avatarLarge: {
    width: "34px",
    height: "34px",
    borderRadius: "10px",
    background:
      "linear-gradient(135deg,#8065ff,#4bbcff)",
    display: "grid",
    placeItems: "center",
    fontWeight: "800",
    fontSize: "12px",
  },

  currentUserInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    fontSize: "12px",
    minWidth: 0,
  },

  statusDot: {
    display: "inline-block",
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    marginRight: "5px",
  },

  chat: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
  },

  header: {
    height: "72px",
    flexShrink: 0,
    padding: "0 25px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "rgba(255,255,255,.012)",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
  },

  channelIcon: {
    width: "34px",
    height: "34px",
    borderRadius: "10px",
    background: "rgba(128,101,255,.1)",
    color: "#8065ff",
    display: "grid",
    placeItems: "center",
    fontSize: "20px",
  },

  channelName: {
    fontWeight: "750",
    fontSize: "15px",
  },

  channelDescription: {
    color: "#59637a",
    fontSize: "10px",
    marginTop: "3px",
  },

  liveStatus: {
    color: "#778198",
    fontSize: "11px",
    display: "flex",
    alignItems: "center",
  },

  messages: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: "25px 28px",
    scrollbarWidth: "thin",
    scrollbarColor:
      "rgba(128,101,255,.18) transparent",
  },

  messageRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: "9px",
    marginBottom: "18px",
  },

  messageAvatar: {
    width: "30px",
    height: "30px",
    flexShrink: 0,
    borderRadius: "9px",
    background:
      "linear-gradient(135deg,#263252,#171d2e)",
    display: "grid",
    placeItems: "center",
    color: "#b9c1d5",
    fontSize: "11px",
    fontWeight: "750",
  },

  messageGroup: {
    maxWidth: "68%",
    display: "flex",
    flexDirection: "column",
  },

  messageMeta: {
    color: "#667087",
    fontSize: "10px",
    marginBottom: "5px",
    padding: "0 4px",
  },

  bubble: {
    padding: "10px 14px",
    borderRadius: "15px",
    fontSize: "13px",
    lineHeight: "1.5",
    wordBreak: "break-word",
  },

  myBubble: {
    background:
      "linear-gradient(135deg,#755cf1,#5a46cc)",
    borderBottomRightRadius: "4px",
    boxShadow:
      "0 5px 20px rgba(92,70,204,.15)",
  },

  otherBubble: {
    background: "rgba(255,255,255,.045)",
    borderBottomLeftRadius: "4px",
    color: "#d4d8e2",
  },

  empty: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },

  emptyIcon: {
    width: "52px",
    height: "52px",
    borderRadius: "15px",
    background: "rgba(128,101,255,.1)",
    color: "#8065ff",
    display: "grid",
    placeItems: "center",
    fontSize: "27px",
    marginBottom: "15px",
  },

  emptyTitle: {
    fontWeight: "700",
    fontSize: "16px",
  },

  emptyText: {
    color: "#59637a",
    fontSize: "12px",
    marginTop: "6px",
  },

  composer: {
    padding: "14px 20px 17px",
  },

  inputWrapper: {
    display: "flex",
    gap: "8px",
    padding: "5px",
    borderRadius: "14px",
    background: "rgba(255,255,255,.035)",
  },

  messageInput: {
    flex: 1,
    minWidth: 0,
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#fff",
    padding: "10px",
    fontSize: "13px",
  },

  sendButton: {
    width: "38px",
    height: "38px",
    flexShrink: 0,
    border: "none",
    borderRadius: "10px",
    background:
      "linear-gradient(135deg,#8065ff,#5c47d1)",
    color: "#fff",
    fontSize: "20px",
    fontWeight: "500",
    cursor: "pointer",
  },

  composerHint: {
    color: "#444e65",
    fontSize: "9px",
    textAlign: "right",
    marginTop: "7px",
    paddingRight: "4px",
  },

  kbd: {
    padding: "2px 5px",
    borderRadius: "4px",
    background: "rgba(255,255,255,.05)",
    color: "#69738b",
  },
};

