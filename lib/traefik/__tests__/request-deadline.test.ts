import { createServer } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let fixture: ReturnType<typeof createServer>;
let closed = 0;
let requests = 0;
beforeEach(async () => {
  closed = 0;
  requests = 0;
  fixture = createServer((request, response) => {
    requests++;
    response.on("close", () => { closed++; });
    const path = request.url ?? "";
    if (path.includes("routers")) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.write("["); // Headers arrive immediately; the body never completes.
    } else if (path.includes("services")) {
      setTimeout(() => response.end(JSON.stringify([{ name: "delayed@file" }])), 100);
    } else if (path.includes("middlewares")) {
      response.writeHead(503);
      response.end("offline");
    } else response.end(JSON.stringify({ http: { routers: { total: 1 } } }));
  });
  await new Promise<void>((resolve) => fixture.listen(0, "127.0.0.1", resolve));
  const address = fixture.address();
  if (!address || typeof address === "string") throw new Error("No fixture port");
  vi.stubEnv("TRAEFIK_API_URL", `http://127.0.0.1:${address.port}`);
});
afterEach(async () => {
  fixture.closeAllConnections();
  await new Promise<void>((resolve) => fixture.close(() => resolve()));
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("real Traefik upstream", () => {
  it("bounds a hanging body while healthy, delayed, and failed requests settle independently", async () => {
    const { getRouters, getServices, getMiddlewares, getOverview } = await import("@/lib/traefik/client");
    const started = performance.now();
    let hungSettled = false;
    const hung = getRouters().finally(() => { hungSettled = true; });
    const rejected = expect(hung).rejects.toMatchObject({ name: "RequestDeadlineError" });
    await expect(getOverview()).resolves.toMatchObject({ http: { routers: { total: 1 } } });
    await expect(getServices()).resolves.toEqual([{ name: "delayed@file" }]);
    await expect(getMiddlewares()).rejects.toThrow("503");
    expect(hungSettled).toBe(false);
    await rejected;
    expect(performance.now() - started).toBeGreaterThanOrEqual(9_900);
    expect(performance.now() - started).toBeLessThan(11_500);
    await expect.poll(() => closed).toBe(4);
  }, 15_000);

  it("aborts the actual upstream body when an incoming request is cancelled", async () => {
    const { getRouters } = await import("@/lib/traefik/client");
    const controller = new AbortController();
    const result = getRouters(controller.signal);
    const rejected = expect(result).rejects.toMatchObject({ name: "AbortError" });
    await expect.poll(() => requests).toBe(1);
    controller.abort();
    await rejected;
    await expect.poll(() => closed).toBe(1);
  });
});
