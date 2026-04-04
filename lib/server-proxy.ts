import { db } from "@/lib/db";
import { server } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getServerById(serverId: string) {
  const result = await db.select().from(server).where(eq(server.id, serverId)).get();
  if (!result) throw new Error(`Server "${serverId}" not found`);
  return result;
}

export async function proxyToAgent<T>(
  serverId: string,
  agentPath: string,
  options?: { method?: string; body?: unknown }
): Promise<T> {
  const srv = await getServerById(serverId);

  const res = await fetch(`${srv.url}/api/agent${agentPath}`, {
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
  apiKey: string
): Promise<{ ok: boolean; version?: string; error?: string }> {
  try {
    const res = await fetch(`${url}/api/agent/health`, {
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
