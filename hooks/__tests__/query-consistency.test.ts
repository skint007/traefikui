import { MutationObserver, onlineManager, QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createGlobalResourceCombiner,
  globalResourceQueries,
  type GlobalResource,
} from "@/hooks/use-all-servers";
import { invalidateServerConfig } from "@/hooks/config-invalidation";
import { traefikQueries } from "@/hooks/traefik-queries";

const clients: QueryClient[] = [];

function createClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 5_000 } },
  });
  clients.push(client);
  return client;
}

afterEach(() => {
  for (const client of clients.splice(0)) client.clear();
  vi.unstubAllGlobals();
  onlineManager.setOnline(true);
});

function mockResources() {
  const fetchResource = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const body = url.includes("resource-map")
      ? { "example@file": "example.yml" }
      : url.includes("/config/list")
        ? ["example.yml"]
        : url.includes("/config/read")
          ? { content: "http: {}", parsed: { http: {} } }
          : [{ name: "example@file", rule: "Host(`example.com`)", type: "loadbalancer" }];
    return new Response(JSON.stringify(body));
  });
  vi.stubGlobal("fetch", fetchResource);
  return fetchResource;
}

describe("shared resource queries", () => {
  it.each(["write", "delete", "rename", "duplicate"])("keeps a paused %s request and its invalidation on the original server", async (operation) => {
    const client = createClient();
    const writes: string[] = [];
    const targets: string[] = [];
    client.setQueryData(traefikQueries.routers("remote-a").queryKey, []);
    client.setQueryData(traefikQueries.routers("remote-b").queryKey, []);
    const options = (serverId: string) => ({
      mutationKey: ["config", operation, serverId],
      mutationFn: async () => { writes.push(serverId); },
      onMutate: () => ({ serverId }),
      onSuccess: async (_data: void, _variables: void, context: { serverId: string } | undefined) => {
        if (!context) throw new Error("Missing mutation target");
        targets.push(context.serverId);
        await invalidateServerConfig(client, context.serverId);
      },
    });
    onlineManager.setOnline(false);
    const observer = new MutationObserver(client, options("remote-a"));
    const pending = observer.mutate();
    await vi.waitFor(() => expect(observer.getCurrentResult().isPaused).toBe(true));
    observer.setOptions(options("remote-b"));
    onlineManager.setOnline(true);
    await client.resumePausedMutations();
    await pending;
    expect(writes).toEqual(["remote-a"]);
    expect(targets).toEqual(["remote-a"]);
    expect(client.getQueryState(traefikQueries.routers("remote-a").queryKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(traefikQueries.routers("remote-b").queryKey)?.isInvalidated).toBe(false);
  });

  it("reuses fresh raw responses when navigating in either direction", async () => {
    const client = createClient();
    const request = mockResources();
    const targets = [{ id: null, name: "Local" }, { id: "remote-a", name: "Remote" }];
    const globalQueries = globalResourceQueries(targets, 10_000);

    // A real observer's select projection leaves its raw API response in cache.
    const select = vi.fn(globalQueries[0].select);
    const globalOptions = { ...globalQueries[0], select };
    const globalObserver = new QueryObserver(client, globalOptions);
    const unsubscribe = globalObserver.subscribe(() => undefined);
    try {
      await vi.waitFor(() => expect(globalObserver.getCurrentResult().isSuccess).toBe(true));
      expect(globalObserver.getCurrentResult().data?.[0]?.serverName).toBe("Local");
      const routers = await client.fetchQuery(traefikQueries.routers(null));
      expect(routers).toEqual([{ name: "example@file", rule: "Host(`example.com`)", type: "loadbalancer" }]);
      expect(request).toHaveBeenCalledTimes(1);
      const selected = globalObserver.getCurrentResult().data;
      globalObserver.setOptions(globalOptions);
      client.setQueryData(traefikQueries.routers(null).queryKey, routers.map((router) => ({ ...router })));
      expect(select).toHaveBeenCalledTimes(1);
      expect(globalObserver.getCurrentResult().data).toBe(selected);

      await client.fetchQuery(traefikQueries.routers("remote-a"));
      const remoteObserver = new QueryObserver(client, globalQueries[3]);
      const unsubscribeRemote = remoteObserver.subscribe(() => undefined);
      try {
        expect(remoteObserver.getCurrentResult().data?.[0]?.serverName).toBe("Remote");
        expect(request).toHaveBeenCalledTimes(2);
      } finally {
        unsubscribeRemote();
      }
    } finally {
      unsubscribe();
    }
  });

  it("refreshes both resource views, config files and maps only for the affected server", async () => {
    const client = createClient();
    const request = mockResources();
    const observers = [
      new QueryObserver(client, traefikQueries.routers(null)),
      new QueryObserver(client, globalResourceQueries([{ id: null, name: "Local" }], 10_000)[0]),
      new QueryObserver(client, traefikQueries.services(null)),
      new QueryObserver(client, traefikQueries.middlewares(null)),
      new QueryObserver(client, traefikQueries.resourceMap(null)),
      new QueryObserver(client, { queryKey: ["config", "files", null], queryFn: async () => { await fetch("/api/config/list"); return ["example.yml"]; } }),
      new QueryObserver(client, { queryKey: ["config", "file", "example.yml", null], queryFn: async () => { await fetch("/api/config/read"); return { content: "http: {}", parsed: { http: {} } }; } }),
      new QueryObserver(client, traefikQueries.routers("remote-a")),
      new QueryObserver(client, traefikQueries.resourceMap("remote-a")),
    ];
    const subscriptions = observers.map((observer) => observer.subscribe(() => undefined));
    try {
      await vi.waitFor(() => expect(observers.every((observer) => observer.getCurrentResult().isSuccess)).toBe(true));
      expect(request).toHaveBeenCalledTimes(8);
      request.mockClear();

      // Both a successful local save and the local SSE stream use this boundary.
      await invalidateServerConfig(client, null);
      expect(request).toHaveBeenCalledTimes(6);
      expect(request.mock.calls.some(([url]) => typeof url === "string" && url.includes("serverId="))).toBe(false);
      expect(observers.every((observer) => observer.getCurrentResult().isSuccess)).toBe(true);

      request.mockClear();
      await invalidateServerConfig(client, "remote-a");
      expect(request).toHaveBeenCalledTimes(2);
      expect(request.mock.calls.every(([url]) => typeof url === "string" && url.includes("serverId=remote-a"))).toBe(true);
    } finally {
      subscriptions.forEach((unsubscribe) => unsubscribe());
    }
  });
});

describe("global resource combination", () => {
  it("retains aggregation across unrelated renders, refetch states and error timestamps", async () => {
    const client = createClient();
    const initial: GlobalResource[] = [{ name: "router-a", type: "router", serverId: null, serverName: "Local" }];
    const request = Promise.withResolvers<GlobalResource[]>();
    const observer = new QueryObserver(client, {
      queryKey: ["combiner-router"],
      queryFn: () => request.promise,
      initialData: initial,
    });
    const unsubscribe = observer.subscribe(() => undefined);
    const combine = createGlobalResourceCombiner([{ id: null, name: "Local" }]);
    try {
      const first = combine([observer.getCurrentResult()]);
      const unrelatedRender = combine([observer.getCurrentResult()]);
      expect(unrelatedRender.resources).toBe(first.resources);
      expect(unrelatedRender.serverCounts).toBe(first.serverCounts);

      const refresh = client.refetchQueries({ queryKey: ["combiner-router"] });
      const fetching = combine([observer.getCurrentResult()]);
      expect(fetching.isFetching).toBe(true);
      expect(fetching.resources).toBe(first.resources);
      expect(fetching.serverCounts).toBe(first.serverCounts);

      request.reject(new Error("offline"));
      await refresh;
      const failed = combine([observer.getCurrentResult()]);
      expect(failed.resources).toBe(first.resources);
      expect(failed.serverCounts?.local.errors).toBe(1);
      expect(failed.isLoading).toBe(false);

      // During a retry isError resets, but the failure timestamp still matters.
      const retry = Promise.withResolvers<GlobalResource[]>();
      observer.setOptions({ queryKey: ["combiner-router"], queryFn: () => retry.promise });
      const retryRefresh = client.refetchQueries({ queryKey: ["combiner-router"] });
      const retrying = combine([observer.getCurrentResult()]);
      expect(retrying.serverCounts).toBe(failed.serverCounts);
      expect(retrying.serverCounts?.local.errors).toBe(1);
      retry.resolve([...initial, { ...initial[0], name: "router-b", type: "router", serverId: null, serverName: "Local" }]);
      await retryRefresh;
      const recovered = combine([observer.getCurrentResult()]);
      expect(recovered.resources).toHaveLength(2);
      expect(recovered.serverCounts?.local).toMatchObject({ routers: 2, errors: 0 });
    } finally {
      unsubscribe();
    }
  });

  it("updates target names and lists without refetching unchanged cached resources", async () => {
    const client = createClient();
    const request = mockResources();
    const observer = new QueryObserver(client, globalResourceQueries([{ id: null, name: "Local" }], 10_000)[0]);
    const unsubscribe = observer.subscribe(() => undefined);
    try {
      await vi.waitFor(() => expect(observer.getCurrentResult().isSuccess).toBe(true));
      const renamed = [{ id: null, name: "Renamed" }, { id: "remote-a", name: "Remote" }];
      observer.setOptions(globalResourceQueries(renamed, 10_000)[0]);
      const combined = createGlobalResourceCombiner(renamed)([observer.getCurrentResult()]);
      expect(combined.resources[0]?.serverName).toBe("Renamed");
      expect(combined.serverCounts?.local.name).toBe("Renamed");
      expect(combined.serverCounts?.["remote-a"]).toMatchObject({ name: "Remote", routers: 0 });
      expect(request).toHaveBeenCalledTimes(1);
    } finally {
      unsubscribe();
    }
  });
});
