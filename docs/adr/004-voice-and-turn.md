# ADR 004 — Two-peer audio with external TURN

**Status:** accepted.

Two-peer audio demonstrates SDP, ICE and media routing without introducing an SFU. Signaling assigns one offerer when the second peer joins, buffers early candidates at the browser, and limits room membership to two.

The signaling registry is process-local, so one signaling replica is intentional. Calls require explicit rejoin after signaling loss. TURN is configured at the client build boundary and provided by an environment-specific relay. Static local demo credentials are not a deployable public relay policy. A production version would issue short-lived TURN credentials and observe selected candidate types and call quality.
