import React, { useRef, useState } from "react";
import { createSignalingConnection } from "./signaling";

export default function Call({ room, onClose }) {
  const peerConnection = useRef(null);
  const socket = useRef(null);
  const localStream = useRef(null);

  const [calling, setCalling] = useState(false);
  const [muted, setMuted] = useState(false);

  async function createPeerConnection() {
    const pc = new RTCPeerConnection();

    pc.onicecandidate = (event) => {
      if (event.candidate && socket.current) {
        socket.current.send(
          JSON.stringify({
            type: "ice-candidate",
            candidate: event.candidate,
          })
        );
      }
    };

    pc.ontrack = (event) => {
      const audio = new Audio();
      audio.srcObject = event.streams[0];
      audio.autoplay = true;
      audio.play().catch(() => {});
    };

    peerConnection.current = pc;

    return pc;
  }

  async function startCall() {
    if (calling) return;

    localStream.current =
      await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

    const pc = await createPeerConnection();

    localStream.current.getTracks().forEach((track) => {
      pc.addTrack(track, localStream.current);
    });

    socket.current = createSignalingConnection(
      room,
      handleSignalingMessage
    );

    socket.current.onopen = async () => {
      const offer = await pc.createOffer();

      await pc.setLocalDescription(offer);

      socket.current.send(
        JSON.stringify({
          type: "offer",
          sdp: offer.sdp,
        })
      );
    };

    setCalling(true);
  }

  async function handleSignalingMessage(message) {
    if (message.type === "offer") {
      if (calling) return;

      localStream.current =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      const pc = await createPeerConnection();

      localStream.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStream.current);
      });

      await pc.setRemoteDescription({
        type: "offer",
        sdp: message.sdp,
      });

      const answer = await pc.createAnswer();

      await pc.setLocalDescription(answer);

      socket.current.send(
        JSON.stringify({
          type: "answer",
          sdp: answer.sdp,
        })
      );

      setCalling(true);
    }

    if (message.type === "answer") {
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription({
          type: "answer",
          sdp: message.sdp,
        });
      }
    }

    if (message.type === "ice-candidate") {
      if (peerConnection.current) {
        try {
          await peerConnection.current.addIceCandidate(
            message.candidate
          );
        } catch (error) {
          console.error(
            "Failed to add ICE candidate:",
            error
          );
        }
      }
    }
  }

  function toggleMute() {
    if (!localStream.current) return;

    const audioTracks =
      localStream.current.getAudioTracks();

    audioTracks.forEach((track) => {
      track.enabled = !track.enabled;
    });

    setMuted((current) => !current);
  }

  function leaveCall() {
    // Stop microphone
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        track.stop();
      });

      localStream.current = null;
    }

    // Close WebRTC connection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    // Close signaling connection
    if (socket.current) {
      socket.current.close();
      socket.current = null;
    }

    setCalling(false);
    setMuted(false);

    if (onClose) {
      onClose();
    }
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}
    >
      {!calling ? (
        <button
          onClick={startCall}
          style={styles.startButton}
        >
          🎙 Start Voice Call
        </button>
      ) : (
        <>
          <div style={styles.callStatus}>
            <span style={styles.greenDot} />
            Voice connected
          </div>

          <button
            onClick={toggleMute}
            style={{
              ...styles.controlButton,
              background: muted
                ? "rgba(255,98,98,.15)"
                : "rgba(255,255,255,.05)",
            }}
          >
            {muted ? "🔇 Unmute" : "🎙 Mute"}
          </button>

          <button
            onClick={leaveCall}
            style={styles.leaveButton}
          >
            📞 Leave
          </button>
        </>
      )}
    </div>
  );
}

const styles = {
  startButton: {
    border: "none",
    borderRadius: "10px",
    padding: "9px 14px",
    background:
      "linear-gradient(135deg,#8065ff,#4bbcff)",
    color: "#fff",
    fontWeight: "700",
    fontSize: "12px",
    cursor: "pointer",
  },

  callStatus: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    color: "#54e58a",
    fontSize: "11px",
    fontWeight: "650",
  },

  greenDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "#54e58a",
    boxShadow:
      "0 0 8px rgba(84,229,138,.7)",
  },

  controlButton: {
    border: "1px solid rgba(255,255,255,.06)",
    borderRadius: "9px",
    padding: "8px 12px",
    color: "#d8dbea",
    cursor: "pointer",
    fontSize: "11px",
  },

  leaveButton: {
    border: "none",
    borderRadius: "9px",
    padding: "8px 12px",
    background: "rgba(255,98,98,.12)",
    color: "#ff7777",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: "650",
  },
};

