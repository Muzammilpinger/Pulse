# Voice and TURN

Open two browser sessions in the same text channel, choose **Join voice**, then join the voice room in each. Allow microphone access. The first peer waits until the second is ready; the UI says “Voice connected” only when the WebRTC peer connection reports connected. Mute toggles the microphone track. Leaving closes sockets, peer connections, and tracks.

The automated test uses Chromium's synthetic audio devices. It proves negotiation and peer connection state on a friendly local network, not real human audibility or internet NAT traversal.

## Optional TURN relay

```sh
docker compose --profile voice up -d coturn
```

For local development, put these demo-only values in `client/.env.local` (ignored by Git):

```dotenv
VITE_TURN_URL=turn:localhost:3478?transport=tcp
VITE_TURN_USER=pulse
VITE_TURN_PASSWORD=pulse
```

Restart Vite (`cd client && npm run dev`) and select **Force TURN** in both voice panels before joining. The relay exposes 3478 TCP/UDP and UDP 49160–49170. Docker Desktop networking may need an advertised reachable relay address; use a real TURN host for a multi-machine test. Confirm the selected ICE candidate pair is `relay` in browser WebRTC diagnostics. A “connected” status without that observation does not prove TURN use.

Vite values are build-time configuration. To bake them into a container, use the documented Docker build args. These credentials become public client configuration: use short-lived TURN credentials for anything exposed beyond localhost.

TURN is not deployed automatically by Helm: it needs environment-specific public IP, UDP ports, and relay addressing. The Kubernetes app supports an externally managed TURN endpoint configured at client build time. Do not route UDP media through the HTTP ingress.
