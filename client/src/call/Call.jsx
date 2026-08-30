import { useRef, useState } from "react";
import { createSignalingConnection } from "./signaling";

export default function Call({ room }) {
  const peerConnection = useRef(null);
  const socket = useRef(null);
  const localStream = useRef(null);

  const [calling, setCalling] = useState(false);

  async function createPeerConnection() {
    const pc = new RTCPeerConnection();

    pc.onicecandidate = (event) => {
      if (event.candidate) {
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
      audio.play();
    };

    peerConnection.current = pc;

    return pc;
  }

  async function startCall() {
    localStream.current =
      await navigator.mediaDevices.getUserMedia({ audio: true });

    const pc = await createPeerConnection();

    localStream.current.getTracks().forEach((track) => {
      pc.addTrack(track, localStream.current);
    });

    socket.current = createSignalingConnection(room, handleSignalingMessage);

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
      localStream.current =
        await navigator.mediaDevices.getUserMedia({ audio: true });

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
      await peerConnection.current.setRemoteDescription({
        type: "answer",
        sdp: message.sdp,
      });
    }

    if (message.type === "ice-candidate") {
      await peerConnection.current.addIceCandidate(
        message.candidate
      );
    }
  }

  return (
    <div>
      <button onClick={startCall}>
        {calling ? "Calling..." : "Start Voice Call"}
      </button>
    </div>
  );
}