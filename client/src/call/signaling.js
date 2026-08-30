const SIGNALING_URL = "ws://127.0.0.1:8002";

export function createSignalingConnection(room, onMessage) {
  const socket = new WebSocket(`${SIGNALING_URL}/ws/${room}`);

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    onMessage(message);
  };

  return socket;
}
