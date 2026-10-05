import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let fixture: ReturnType<typeof createServer>;
let directory: string;
let url: string;
let requested = 0;
let closed = 0;

beforeEach(async () => {
  requested = 0;
  closed = 0;
  directory = await mkdtemp(path.join(tmpdir(), "traefikui-deadline-"));
  const databasePath = path.join(directory, "test.db");
  vi.stubEnv("DATABASE_URL", `file:${databasePath}`);
  vi.stubEnv("TRAEFIKUI_MODE", "master");
  vi.stubEnv("TRAEFIKUI_STRICT_SSRF", "0");
  fixture = createServer((request, response) => {
    requested++;
    response.on("close", () => { closed++; });
    if (request.url?.includes("healthy")) response.end(JSON.stringify([{ name: "healthy@file" }]));
    else if (request.url?.includes("timeout")) {
      response.writeHead(504);
      response.end('{"error":"Request timed out after 10 seconds"}');
    }
    else if (request.url?.includes("delayed")) setTimeout(() => response.end("[]"), 100);
    else if (request.url?.includes("error-body")) {
      response.writeHead(503);
      response.write("partial error");
    } else if (request.url?.includes("failed")) {
      response.writeHead(503);
      response.end("offline");
    } else if (request.url?.includes("body")) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.write("[");
    } // The remaining paths never send headers.
  });
  await new Promise<void>((resolve) => fixture.listen(0, "0.0.0.0", resolve));
  const address = fixture.address();
  if (!address || typeof address === "string") throw new Error("No fixture port");
  // Exercise SSRF validation through a real LAN address instead of allowing loopback.
  const host = Object.values(networkInterfaces()).flat().find((address) => address?.family === "IPv4" && !address.internal)?.address;
  if (!host) throw new Error("A LAN address is required to test agent SSRF validation");
  url = `http://${host}:${address.port}`;
  const sqlite = new Database(databasePath);
  sqlite.exec(`CREATE TABLE server (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, url TEXT NOT NULL, api_key TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'unknown',
    last_seen INTEGER, created_at INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL DEFAULT 0
  )`);
  sqlite.prepare("INSERT INTO server (id, name, url, api_key) VALUES (?, ?, ?, ?)").run("remote", "Fixture", url, "test-key");
  sqlite.close();
});
afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  fixture.closeAllConnections();
  await new Promise<void>((resolve) => fixture.close(() => resolve()));
  await rm(directory, { recursive: true, force: true });
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("real agent proxy", () => {
  it("bounds missing headers, a hanging success body, and a hanging error body", async () => {
    const { proxyToAgent, checkAgentHealth } = await import("@/lib/server-proxy");
    const started = performance.now();
    const hangs = ["/hang", "/body", "/error-body"].map((resource) =>
      expect(proxyToAgent("remote", resource)).rejects.toMatchObject({ name: "RequestDeadlineError" }));
    const healthChecks = [url, `${url}/body`].map((healthUrl) =>
      expect(checkAgentHealth(healthUrl, "test-key")).resolves.toMatchObject({ ok: false, error: "Request timed out after 5 seconds" }));
    await expect(proxyToAgent("remote", "/healthy")).resolves.toEqual([{ name: "healthy@file" }]);
    await expect(proxyToAgent("remote", "/delayed")).resolves.toEqual([]);
    await expect(proxyToAgent("remote", "/failed")).rejects.toThrow("offline");
    await Promise.all([...hangs, ...healthChecks]);
    expect(performance.now() - started).toBeLessThan(11_500);
    await expect.poll(() => closed).toBe(8);
  }, 15_000);

  it("cancels an actual proxy request and retains syntactic/DNS SSRF rejection", async () => {
    const { proxyToAgent, checkAgentHealth } = await import("@/lib/server-proxy");
    const controller = new AbortController();
    const rejected = expect(proxyToAgent("remote", "/hang", { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    await expect.poll(() => requested).toBe(1);
    controller.abort();
    await rejected;
    await expect.poll(() => closed).toBe(1);
    await expect(checkAgentHealth("http://127.0.0.1", "test-key")).resolves.toMatchObject({ ok: false, error: expect.stringContaining("Blocked outbound request") });
    const { validateResolvedHost } = await import("@/lib/validate-url");
    await expect(validateResolvedHost("localhost")).resolves.toMatchObject({ valid: false, error: expect.stringContaining("blocked") });
    expect(requested).toBe(1);
  });

  it("preserves an agent timeout as HTTP 504 through the proxy", async () => {
    const { proxyToAgent } = await import("@/lib/server-proxy");
    const { requestErrorStatus } = await import("@/lib/request-deadline");
    const error = await proxyToAgent("remote", "/timeout").catch((error: unknown) => error);
    expect(requestErrorStatus(error, 502)).toBe(504);
  });

  it("bounds health checks before DNS finishes and never dispatches after a late DNS result", async () => {
    // Node's getaddrinfo has no abort API. Control that one phase to prove a
    // stalled lookup cannot defeat the deadline or launch a request later.
    vi.useFakeTimers();
    const lookup = Promise.withResolvers<{ valid: true; addresses: string[] }>();
    const validator = await import("@/lib/validate-url");
    vi.spyOn(validator, "validateResolvedHost").mockReturnValue(lookup.promise);
    const { checkAgentHealth } = await import("@/lib/server-proxy");
    const health = checkAgentHealth(`http://fixture.invalid:${new URL(url).port}`, "test-key");
    await vi.advanceTimersByTimeAsync(5_000);
    await expect(health).resolves.toEqual({ ok: false, error: "Request timed out after 5 seconds" });
    expect(vi.getTimerCount()).toBe(0);
    lookup.resolve({ valid: true, addresses: [new URL(url).hostname] });
    await vi.advanceTimersByTimeAsync(0);
    expect(requested).toBe(0);
  });
});
