export const wsUrl = (path) =>
  `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}${path}`;
export function connectWebSocket(room, token, onEvent, onStatus, onReady) {
  let socket,
    timer,
    stopped = false,
    attempt = 0;
  function connect() {
    onStatus(attempt ? "Reconnecting" : "Connecting");
    socket = new WebSocket(
      wsUrl(
        `/api/ws?room=${encodeURIComponent(room)}&token=${encodeURIComponent(token)}`,
      ),
    );
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "ready") {
        attempt = 0;
        onStatus("Connected");
        onReady(data);
      } else onEvent(data);
    };
    socket.onclose = (event) => {
      if (stopped) return;
      if ([4401, 4403, 1008].includes(event.code)) {
        onStatus("Session expired");
        return;
      }
      onStatus("Reconnecting");
      timer = setTimeout(
        connect,
        Math.min(1000 * 2 ** attempt++, 10000) + Math.random() * 400,
      );
    };
  }
  connect();
  return {
    send: (text) => {
      if (socket.readyState !== WebSocket.OPEN) return false;
      socket.send(text);
      return true;
    },
    close: () => {
      stopped = true;
      clearTimeout(timer);
      socket?.close();
    },
  };
}
