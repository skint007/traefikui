import { db } from "@/lib/db";
import { server } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { validateServerUrl, validateResolvedHost } from "@/lib/validate-url";
import { HEALTH_DEADLINE_MS, RequestDeadlineError, OUTBOUND_DEADLINE_MS, withRequestDeadline } from "@/lib/request-deadline";

export async function getServerById(serverId: string) {
  const result = await db
    .select()
    .from(server)
    .where(eq(server.id, serverId))
    .get();
  if (!result) throw new Error("Server not found");
  return result;
}

/**
 * Dispatch an outbound request to a server URL after re-validating the URL
 * string and DNS resolution. Defeats DNS-rebinding bypasses of the syntactic
 * check performed at registration time.
 */
async function safeFetch(url: string, init: RequestInit): Promise<Response> {
  const urlCheck = validateServerUrl(url);
  if (!urlCheck.valid) {
    throw new Error(`Blocked outbound request: ${urlCheck.error ?? "invalid URL"}`);
  }
  const parsed = new URL(url);
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
  init.signal?.throwIfAborted();
  const resolved = await validateResolvedHost(hostname);
  init.signal?.throwIfAborted();
  if (!resolved.valid) {
    throw new Error(`Blocked outbound request: ${resolved.error}`);
  }
  return fetch(url, init);
}

export async function proxyToAgent<T>(
  serverId: string,
  agentPath: string,
  options?: { method?: string; body?: unknown; signal?: AbortSignal },
): Promise<T> {
  return withRequestDeadline(async (signal) => {
    const srv = await getServerById(serverId);

    const res = await safeFetch(`${srv.url}/api/agent${agentPath}`, {
      signal,
      method: options?.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": srv.apiKey,
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      // Preserve an agent's timeout state instead of turning it into a retryable 502.
      if (res.status === 504) throw new RequestDeadlineError(OUTBOUND_DEADLINE_MS);
      throw new Error(text || `Agent error: ${res.status}`);
    }

    return res.json();
  }, { signal: options?.signal });
}

export async function checkAgentHealth(
  url: string,
  apiKey: string,
  incomingSignal?: AbortSignal,
): Promise<{ ok: boolean; version?: string; error?: string }> {
  try {
    return await withRequestDeadline(async (signal) => {
      const res = await safeFetch(`${url}/api/agent/health`, {
        headers: { "X-API-Key": apiKey },
        signal,
      });

      if (!res.ok) {
        await res.body?.cancel();
        return { ok: false, error: `HTTP ${res.status}` };
      }

      const data = await res.json();
      return { ok: true, version: data.version };
    }, { signal: incomingSignal, timeoutMs: HEALTH_DEADLINE_MS });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Connection failed",
    };
  }
}
