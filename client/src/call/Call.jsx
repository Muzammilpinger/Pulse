import React, { useEffect, useRef, useState } from "react";
import { wsUrl } from "../chat/websocket";
export default function Call({ room, token, onClose }) {
  const [status, setStatus] = useState("Ready to join"),
    [muted, setMuted] = useState(false),
    [relay, setRelay] = useState(false);
  const resources = useRef({}),
    audio = useRef(null),
    generation = useRef(0);
  function cleanup() {
    generation.current++;
    const r = resources.current;
    r.socket?.close();
    r.pc?.close();
    r.stream?.getTracks().forEach((t) => t.stop());
    resources.current = {};
  }
  useEffect(() => () => cleanup(), []);
  async function join() {
    cleanup();
    const gen = generation.current;
    setStatus("Requesting microphone");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (gen !== generation.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      resources.current.stream = stream;
      const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
      if (import.meta.env.VITE_TURN_URL)
        iceServers.push({
          urls: import.meta.env.VITE_TURN_URL,
          username: import.meta.env.VITE_TURN_USER,
          credential: import.meta.env.VITE_TURN_PASSWORD,
        });
      if (relay && iceServers.length < 2)
        throw Error("TURN is not configured. See the voice setup guide.");
      const pc = new RTCPeerConnection({
        iceServers,
        iceTransportPolicy: relay ? "relay" : "all",
      });
      const socket = new WebSocket(
        wsUrl(`/signal/ws/${room}?token=${encodeURIComponent(token)}`),
      );
      resources.current = { pc, socket, stream };
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      const pending = [];
      pc.onicecandidate = (e) => {
        if (e.candidate && socket.readyState === 1)
          socket.send(
            JSON.stringify({ type: "ice-candidate", candidate: e.candidate }),
          );
      };
      pc.ontrack = (e) => {
        audio.current.srcObject = e.streams[0];
        audio.current
          .play()
          .catch(() => setStatus("Tap the audio player to hear your peer"));
      };
      pc.onconnectionstatechange = () => {
        if (
          gen === generation.current &&
          socket.readyState === 1 &&
          ["connected", "failed"].includes(pc.connectionState)
        )
          socket.send(
            JSON.stringify({ type: "peer-state", state: pc.connectionState }),
          );
        if (gen === generation.current)
          setStatus(
            {
              connected: "Voice connected",
              failed: "Connection failed — leave and retry",
              disconnected: "Peer connection interrupted",
            }[pc.connectionState] || "Connecting voice",
          );
      };
      socket.onclose = () => {
        if (gen === generation.current) {
          cleanup();
          setStatus("Voice disconnected — join again");
        }
      };
      let chain = Promise.resolve();
      socket.onmessage = (e) => {
        chain = chain
          .then(async () => {
            if (gen !== generation.current) return;
            const m = JSON.parse(e.data);
            if (m.type === "waiting") setStatus("Waiting for a second person");
            if (m.type === "error") throw Error(m.message);
            if (m.type === "peer-left") {
              cleanup();
              setStatus("Your peer left — join again");
              return;
            }
            if (m.type === "peer-ready" && m.initiator) {
              await pc.setLocalDescription(await pc.createOffer());
              socket.send(
                JSON.stringify({ type: "offer", sdp: pc.localDescription.sdp }),
              );
              setStatus("Connecting voice");
            }
            if (m.type === "offer" || m.type === "answer") {
              await pc.setRemoteDescription({ type: m.type, sdp: m.sdp });
              for (const candidate of pending.splice(0))
                await pc.addIceCandidate(candidate);
              if (m.type === "offer") {
                await pc.setLocalDescription(await pc.createAnswer());
                socket.send(
                  JSON.stringify({
                    type: "answer",
                    sdp: pc.localDescription.sdp,
                  }),
                );
              }
            }
            if (m.type === "ice-candidate") {
              if (pc.remoteDescription) await pc.addIceCandidate(m.candidate);
              else pending.push(m.candidate);
            }
          })
          .catch((error) => {
            if (gen !== generation.current) return;
            cleanup();
            setStatus(error.message);
          });
      };
    } catch (error) {
      cleanup();
      setStatus(error.message || "Microphone unavailable");
    }
  }
  return (
    <section className="call-panel" aria-label="Voice room">
      <div>
        <strong>
          Voice lounge <span className="tag">1:1 AUDIO</span>
        </strong>
        <p role="status">{status}</p>
      </div>
      <audio ref={audio} autoPlay controls aria-label="Peer audio" />
      {!resources.current.pc ? (
        <>
          <label className="relay">
            <input
              type="checkbox"
              checked={relay}
              onChange={(e) => setRelay(e.target.checked)}
            />
            Force TURN
          </label>
          <button onClick={join}>Join voice</button>
        </>
      ) : (
        <button
          onClick={() => {
            resources.current.stream
              .getAudioTracks()
              .forEach((t) => (t.enabled = muted));
            setMuted(!muted);
          }}
        >
          {muted ? "Unmute" : "Mute"}
        </button>
      )}
      <button
        className="subtle"
        onClick={() => {
          cleanup();
          onClose();
        }}
      >
        Leave
      </button>
    </section>
  );
}
