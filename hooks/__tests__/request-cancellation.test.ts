import { createServer } from "node:http";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { traefikQueries } from "@/hooks/traefik-queries";
import { createGlobalResourceCombiner, globalResourceQueries } from "@/hooks/use-all-servers";

let fixture: ReturnType<typeof createServer>;
let client: QueryClient;
const counts = new Map<string, number>();
let hangingClosed = 0;
const originalFetch = globalThis.fetch;
beforeEach(async () => {
  counts.clear();
  hangingClosed = 0;
  client = new QueryClient({ defaultOptions: { queries: { staleTime: 5_000 } } });
  fixture = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://fixture");
    const target = url.searchParams.get("serverId") ?? "local";
    counts.set(target, (counts.get(target) ?? 0) + 1);
    if (target === "hanging") {
      response.on("close", () => { hangingClosed++; });
      response.writeHead(200, { "Content-Type": "application/json" });
      response.write("[");
    } else if (target === "failing") {
      response.writeHead(503);
      response.end(JSON.stringify({ error: "Agent offline" }));
    } else if (target === "timeout") {
      response.writeHead(504);
      response.end(JSON.stringify({ error: "Request timed out after 10 seconds" }));
    } else response.end(JSON.stringify([{ name: "healthy@file" }]));
  });
  await new Promise<void>((resolve) => fixture.listen(0, "127.0.0.1", resolve));
  const address = fixture.address();
  if (!address || typeof address === "string") throw new Error("No fixture port");
  // Node has no document base URL. Resolve the browser's relative API URLs,
  // then use the real fetch implementation and real HTTP/body cancellation.
  const origin = `http://127.0.0.1:${address.port}`;
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) =>
    originalFetch(typeof input === "string" ? new URL(input, origin) : input, init));
});
afterEach(async () => {
  client.clear();
  vi.unstubAllGlobals();
  fixture.closeAllConnections();
  await new Promise<void>((resolve) => fixture.close(() => resolve()));
});

describe("query cancellation and bounded retries", () => {
  it("cancels a real request on server switch and on final observer unsubscribe", async () => {
    const observer = new QueryObserver(client, traefikQueries.routers("hanging"));
    const unsubscribe = observer.subscribe(() => undefined);
    await expect.poll(() => counts.get("hanging")).toBe(1);
    observer.setOptions(traefikQueries.routers("healthy"));
    await expect.poll(() => hangingClosed).toBe(1);
    await expect.poll(() => observer.getCurrentResult().isSuccess).toBe(true);
    expect(observer.getCurrentResult().data).toEqual([{ name: "healthy@file" }]);
    observer.setOptions(traefikQueries.routers("hanging"));
    await expect.poll(() => counts.get("hanging")).toBe(2);
    unsubscribe();
    await expect.poll(() => hangingClosed).toBe(2);
  });

  it("keeps healthy global resources usable through failures and browser body deadlines", async () => {
    const targets = [{ id: "healthy", name: "Healthy" }, { id: "hanging", name: "Hanging" }, { id: "failing", name: "Failing" }];
    const observers = globalResourceQueries(targets, 30_000).map((options) => new QueryObserver(client, options));
    const subscriptions = observers.map((observer) => observer.subscribe(() => undefined));
    const combine = createGlobalResourceCombiner(targets);
    const current = () => combine(observers.map((observer) => observer.getCurrentResult()));
    try {
      await expect.poll(() => current().resources.length).toBe(3);
      expect(current().isLoading).toBe(false);
      expect(current().isFetching).toBe(true);
      // Polling handles recovery; each resource makes one failed attempt.
      await expect.poll(() => counts.get("failing"), { timeout: 3_000 }).toBe(3);
      await expect.poll(() => current().isFetching, { timeout: 17_000 }).toBe(false);
      expect(current().resources).toHaveLength(3);
      expect(current().serverCounts?.hanging.errors).toBe(1);
      expect(current().serverCounts?.failing.errors).toBe(1);
      expect(counts.get("hanging")).toBe(3);
      expect(counts.get("healthy")).toBe(3);
      await expect.poll(() => hangingClosed).toBe(3);
    } finally {
      subscriptions.forEach((unsubscribe) => unsubscribe());
    }
  }, 21_000);

  it("shows timeout text and does not retry an upstream deadline", async () => {
    await expect(client.fetchQuery(traefikQueries.routers("timeout"))).rejects.toThrow("Request timed out after 10 seconds");
    expect(counts.get("timeout")).toBe(1);
  });
});
