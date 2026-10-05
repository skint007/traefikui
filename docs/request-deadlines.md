# Request deadlines

Local Traefik requests and remote agent requests have a 10-second deadline per outbound operation. The deadline starts before agent hostname validation and ends after the success or error response body has been read. Health checks use 5 seconds. Browser resource and config requests use 15 seconds, including the API response body.

Resource and proxied config timeouts return HTTP 504 with a readable timeout message. Health checks return `ok: false` with timeout text. A browser deadline rejects the query with timeout text. A cancelled inbound request aborts outbound HTTP work where the runtime supplies a request abort signal. TanStack Query passes its signal to browser fetches, so changing servers or removing the last observer cancels obsolete requests. Shared requests continue while another observer still needs them.

Timers and abort listeners are removed on success, failure, timeout, and cancellation. Node's DNS lookup cannot be cancelled. The deadline stops waiting for it, and a late result cannot start a fetch. Normal agent URL and resolved-address SSRF checks still run. The existing gap between validation DNS and fetch DNS remains.

Polled resource queries make one attempt and recover through polling. Healthy queries default to 15 seconds; failed queries wait at least 60 seconds and do not retry on focus or mount. Existing saved polling intervals remain honored, including disabled polling. Non-polled config and template queries retry a transient failure once, after 1 second. They do not immediately retry timeouts, cancellations, or HTTP 4xx responses. Config mutations are not retried automatically. A timed-out write may already have reached the agent, so inspect the resulting file before repeating it. See [refresh efficiency](refresh-efficiency.md) for event batching and measurements.

Each server has independent query state. Healthy and cached resource results remain usable while other servers are pending or fail.

Run the HTTP fixture and cancellation checks with `pnpm exec vitest run lib/__tests__/request-deadline.test.ts lib/__tests__/server-proxy-deadline.test.ts lib/traefik/__tests__/request-deadline.test.ts hooks/__tests__/request-cancellation.test.ts`. These use real HTTP servers and response bodies. Only the stalled DNS phase is controlled, because Node does not provide a cancellable resolver for it.
