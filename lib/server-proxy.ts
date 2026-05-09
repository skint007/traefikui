import { db } from "@/lib/db";
import { server } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { validateServerUrl, validateResolvedHost } from "@/lib/validate-url";

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
  const resolved = await validateResolvedHost(hostname);
  if (!resolved.valid) {
    throw new Error(`Blocked outbound request: ${resolved.error}`);
  }
  return fetch(url, init);
}

export async function proxyToAgent<T>(
  serverId: string,
  agentPath: string,
  options?: { method?: string; body?: unknown },
): Promise<T> {
  const srv = await getServerById(serverId);

  const res = await safeFetch(`${srv.url}/api/agent${agentPath}`, {
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
    throw new Error(text || `Agent error: ${res.status}`);
  }

  return res.json();
}

export async function checkAgentHealth(
  url: string,
  apiKey: string,
): Promise<{ ok: boolean; version?: string; error?: string }> {
  try {
    const res = await safeFetch(`${url}/api/agent/health`, {
      headers: { "X-API-Key": apiKey },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { ok: true, version: data.version };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Connection failed",
    };
  }
}
