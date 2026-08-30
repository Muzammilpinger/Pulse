import { useRef, useState } from "react";
import { createSignalingConnection } from "./signaling";

export default function Call({ room }) {
  const peerConnection = useRef(null);
  const socket = useRef(null);
  const localStream = useRef(null);

  const [calling, setCalling] = useState(false);

  async function startCall() {
    localStream.current = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    peerConnection.current = new RTCPeerConnection();

    localStream.current.getTracks().forEach((track) => {
      peerConnection.current.addTrack(track, localStream.current);
    });

    socket.current = createSignalingConnection(room, async (message) => {
      if (message.type === "answer") {
        await peerConnection.current.setRemoteDescription(message);
      }

      if (message.type === "ice-candidate") {
        await peerConnection.current.addIceCandidate(message.candidate);
      }
    });

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.current.send(
          JSON.stringify({
            type: "ice-candidate",
            candidate: event.candidate,
          })
        );
      }
    };

    const offer = await peerConnection.current.createOffer();

    await peerConnection.current.setLocalDescription(offer);

    socket.current.onopen = () => {
      socket.current.send(
        JSON.stringify({
          type: "offer",
          sdp: offer.sdp,
        })
      );
    };

    setCalling(true);
  }

  return (
    <div>
      <button onClick={startCall}>
        {calling ? "Calling..." : "Start Voice Call"}
      </button>
    </div>
  );
}
