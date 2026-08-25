export function connectWebSocket(
  roomId,
  userId,
  onMessage,
  onStatus,
  onPresence
) {
  const socket = new WebSocket(
    `ws://127.0.0.1:8001/ws?room=${encodeURIComponent(
      roomId
    )}&user=${encodeURIComponent(userId)}`
  );

  socket.onopen = () => {
    console.log("🟢 Connected to Pulse");
    onStatus("online");
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      console.log("🔥 WebSocket received:", data);

      if (data.type === "message") {
        onMessage(data);
        return;
      }

      if (data.type === "presence") {
        onPresence(data);
        return;
      }

      if (data.type === "presence_list") {
        onPresence({
          type: "presence_list",
          users: data.users,
        });
      }
    } catch (error) {
      console.error(
        "Failed to parse WebSocket message:",
        error
      );
    }
  };

  socket.onclose = () => {
    console.log("🔴 Disconnected from Pulse");
    onStatus("offline");
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
    onStatus("offline");
  };

  return socket;
}