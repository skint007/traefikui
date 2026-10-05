import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { NextRequest } from "next/server";
import { ResourceFileMapCache } from "../resource-map-cache";

vi.mock("@/lib/require-session", () => ({
  requireSession: async () => ({ user: { id: "cache-test" } }),
}));
vi.mock("@/lib/server-proxy", () => ({
  proxyToAgent: vi.fn(),
}));

function config(name: string) {
  return `http:\n  routers:\n    ${name}: {}\n  services:\n    ${name}-service: {}\n  middlewares:\n    ${name}-middleware: {}\n`;
}

function mapping(name: string, file: string) {
  return {
    [`${name}@file`]: file,
    [`${name}-service@file`]: file,
    [`${name}-middleware@file`]: file,
  };
}

describe("ResourceFileMapCache rebuild coordination", () => {
  it("shares a concurrent build and reuses its completed result", async () => {
    const cache = new ResourceFileMapCache();
    const pending = Promise.withResolvers<Record<string, string>>();
    const build = vi.fn(() => pending.promise);
    const callers = Array.from({ length: 8 }, () => cache.get(build));
    expect(build).toHaveBeenCalledTimes(1);
    const map = mapping("one", "one.yaml");
    pending.resolve(map);
    for (const result of await Promise.all(callers)) expect(result).toBe(map);
    expect(await cache.get(build)).toBe(map);
    expect(build).toHaveBeenCalledTimes(1);
  });

  it("retries an invalidated rebuild before returning or caching it", async () => {
    const cache = new ResourceFileMapCache();
    const pending = Promise.withResolvers<Record<string, string>>();
    const current = mapping("current", "current.yaml");
    const build = vi.fn<() => Promise<Record<string, string>>>()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue(current);
    const first = cache.get(build);
    cache.invalidate();
    const second = cache.get(build);
    pending.resolve(mapping("stale", "stale.yaml"));
    expect(await first).toBe(current);
    expect(await second).toBe(current);
    expect(await cache.get(build)).toBe(current);
    expect(build).toHaveBeenCalledTimes(2);
  });

  it("allows a failed rebuild to recover on the next read", async () => {
    const cache = new ResourceFileMapCache();
    const current = mapping("recovered", "recovered.yaml");
    const build = vi.fn<() => Promise<Record<string, string>>>()
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValue(current);
    await expect(cache.get(build)).rejects.toThrow("temporary failure");
    expect(await cache.get(build)).toBe(current);
  });
});

describe("resource map with real config files", () => {
  let directory: string;

  beforeEach(async () => {
    vi.resetModules();
    directory = await fs.mkdtemp(path.join(os.tmpdir(), "traefikui-map-test-"));
    vi.stubEnv("CONFIG_DIR", directory);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AGENT_API_KEY", "test-api-key");
  });

  afterEach(async () => {
    await globalThis.traefikConfigWatchers?.get(directory)?.stop();
    globalThis.traefikConfigWatchers?.delete(directory);
    globalThis.traefikResourceFileMapCaches?.delete(directory);
    await fs.rm(directory, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  it("invalidates immediately after create, edit, rename, duplicate, and delete", async () => {
    const helpers = await import("../yaml-helpers");
    expect(await helpers.buildResourceFileMap()).toEqual({});
    await helpers.writeConfigFile("one.yaml", config("one"));
    const first = await helpers.buildResourceFileMap();
    expect(first).toEqual(mapping("one", "one.yaml"));
    expect(await helpers.buildResourceFileMap()).toBe(first);
    await helpers.writeConfigFile("one.yaml", config("edited"));
    expect(await helpers.buildResourceFileMap()).toEqual(mapping("edited", "one.yaml"));
    await helpers.renameConfigFile("one.yaml", "nested/renamed.yml");
    expect(await helpers.buildResourceFileMap()).toEqual(mapping("edited", "nested/renamed.yml"));
    await helpers.copyConfigFile("nested/renamed.yml", "z-copy.yaml");
    expect(await helpers.buildResourceFileMap()).toEqual(mapping("edited", "z-copy.yaml"));
    await helpers.deleteConfigFile("z-copy.yaml");
    expect(await helpers.buildResourceFileMap()).toEqual(mapping("edited", "nested/renamed.yml"));
    await helpers.deleteConfigFile("nested/renamed.yml");
    expect(await helpers.buildResourceFileMap()).toEqual({});
  });

  it("rebuilds after files change while its watcher is stopped", async () => {
    const helpers = await import("../yaml-helpers");
    const { getConfigWatcher } = await import("../../watcher");
    await helpers.writeConfigFile("one.yaml", config("one"));
    expect(await helpers.buildResourceFileMap()).toEqual(mapping("one", "one.yaml"));
    await getConfigWatcher(directory).stop();
    await fs.writeFile(path.join(directory, "one.yaml"), config("changed-while-stopped"));
    expect(await helpers.buildResourceFileMap()).toEqual(mapping("changed-while-stopped", "one.yaml"));
  });

  it("shares the watcher and map across production module reloads", async () => {
    const first = await import("../yaml-helpers");
    const firstWatcher = await import("../../watcher");
    await first.writeConfigFile("one.yaml", config("one"));
    const map = await first.buildResourceFileMap();
    vi.resetModules();
    const second = await import("../yaml-helpers");
    const secondWatcher = await import("../../watcher");
    expect(secondWatcher.configWatcher).toBe(firstWatcher.configWatcher);
    expect(await second.buildResourceFileMap()).toBe(map);
    await second.writeConfigFile("two.yaml", config("two"));
    expect(await first.buildResourceFileMap()).toEqual({
      ...mapping("one", "one.yaml"), ...mapping("two", "two.yaml"),
    });
  });

  it.each(["master", "agent"])("refreshes %s API results after external changes without SSE", async (mode) => {
    const route = mode === "master"
      ? await import("../../../app/api/config/resource-map/route")
      : await import("../../../app/api/agent/config/resource-map/route");
    const read = async () => {
      const request = new NextRequest(`http://localhost/api/${mode === "agent" ? "agent/" : ""}config/resource-map`, {
        headers: { "x-api-key": "test-api-key" },
      });
      const response = await route.GET(request);
      expect(response.status).toBe(200);
      return response.json();
    };
    await fs.writeFile(path.join(directory, "one.yaml"), config("one"));
    expect(await read()).toEqual(mapping("one", "one.yaml"));
    await fs.writeFile(path.join(directory, "one.yaml"), config("edited"));
    await expect.poll(read, { timeout: 5000 }).toEqual(mapping("edited", "one.yaml"));
    await fs.writeFile(path.join(directory, "one.yaml"), "http: [broken\n");
    await expect.poll(read, { timeout: 5000 }).toEqual({});
    await fs.writeFile(path.join(directory, "one.yaml"), config("recovered"));
    await expect.poll(read, { timeout: 5000 }).toEqual(mapping("recovered", "one.yaml"));
    await fs.mkdir(path.join(directory, "nested"));
    await fs.rename(path.join(directory, "one.yaml"), path.join(directory, "nested", "renamed.yml"));
    await expect.poll(read, { timeout: 5000 }).toEqual(mapping("recovered", "nested/renamed.yml"));
    await fs.writeFile(path.join(directory, "external.yaml"), config("external"));
    await expect.poll(read, { timeout: 5000 }).toEqual({
      ...mapping("external", "external.yaml"), ...mapping("recovered", "nested/renamed.yml"),
    });
    await fs.rm(path.join(directory, "nested"), { recursive: true });
    await fs.unlink(path.join(directory, "external.yaml"));
    await expect.poll(read, { timeout: 5000 }).toEqual({});
  });

  it("skips invalid YAML and malformed resource shapes alongside valid files", async () => {
    await fs.writeFile(path.join(directory, "good.yaml"), config("good"));
    await fs.writeFile(path.join(directory, "bad.yaml"), "http: [broken\n");
    await fs.writeFile(path.join(directory, "shape.yaml"), "http:\n  routers: string\n  services: [one, two]\n");
    const { buildResourceFileMap } = await import("../yaml-helpers");
    expect(await buildResourceFileMap()).toEqual(mapping("good", "good.yaml"));
  });
});
