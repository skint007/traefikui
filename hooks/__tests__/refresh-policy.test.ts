import { focusManager, QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { invalidateServerConfig } from "@/hooks/config-invalidation";
import { resourcePollingOptions } from "@/hooks/refresh-policy";

const clients: QueryClient[] = [];
function observe(queryFn: () => Promise<string>, options = resourcePollingOptions(15_000)) {
  const client = new QueryClient();
  clients.push(client);
  const queryKey = ["traefik", "routers", null];
  client.setQueryData(queryKey, "before");
  const observer = new QueryObserver(client, { queryKey, queryFn, ...options });
  const unsubscribe = observer.subscribe(() => undefined);
  return { client, observer, unsubscribe, queryKey };
}

afterEach(() => {
  clients.splice(0).forEach((client) => client.clear());
  focusManager.setFocused(undefined);
  vi.useRealTimers();
});

describe("refresh scheduling", () => {
  it("coalesces a save, its watcher event and a file burst into one final refresh", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(async () => "after");
    const { client, observer, unsubscribe } = observe(fetch);
    try {
      const save = invalidateServerConfig(client, null);
      await vi.advanceTimersByTimeAsync(400);
      const events = Array.from({ length: 10 }, () => invalidateServerConfig(client, null));
      await vi.advanceTimersByTimeAsync(499);
      expect(fetch).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      await Promise.all([save, ...events]);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(observer.getCurrentResult().data).toBe("after");
    } finally { unsubscribe(); }
  });

  it("waits for an older snapshot and then fetches the final changed state", async () => {
    vi.useFakeTimers();
    const oldSnapshot = Promise.withResolvers<string>();
    const fetch = vi.fn(async () => "after").mockImplementationOnce(() => oldSnapshot.promise);
    const { client, observer, unsubscribe, queryKey } = observe(fetch);
    try {
      const oldRefresh = client.refetchQueries({ queryKey });
      const changed = invalidateServerConfig(client, null);
      await vi.advanceTimersByTimeAsync(500);
      expect(fetch).toHaveBeenCalledTimes(1);
      oldSnapshot.resolve("before");
      await oldRefresh;
      await changed;
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(observer.getCurrentResult().data).toBe("after");
    } finally { unsubscribe(); }
  });

  it("refreshes during a sustained burst instead of postponing forever", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(async () => "after");
    const { client, unsubscribe } = observe(fetch);
    try {
      const refreshes = [invalidateServerConfig(client, null)];
      for (let i = 0; i < 14; i++) {
        await vi.advanceTimersByTimeAsync(100);
        refreshes.push(invalidateServerConfig(client, null));
      }
      expect(fetch).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(100);
      await Promise.all(refreshes);
      expect(fetch).toHaveBeenCalledTimes(1);
    } finally { unsubscribe(); }
  });

  it("marks hidden cached results stale without a request and refreshes on focus", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(async () => "after");
    const { client, observer, unsubscribe, queryKey } = observe(fetch);
    client.mount();
    try {
      focusManager.setFocused(false);
      const hiddenEvent = invalidateServerConfig(client, null);
      await vi.advanceTimersByTimeAsync(500);
      await hiddenEvent;
      expect(fetch).not.toHaveBeenCalled();
      expect(client.getQueryState(queryKey)?.isInvalidated).toBe(true);
      expect(observer.getCurrentResult().data).toBe("before");
      focusManager.setFocused(true);
      await vi.advanceTimersByTimeAsync(0);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(observer.getCurrentResult().data).toBe("after");
    } finally { unsubscribe(); client.unmount(); }
  });

  it("preserves cached data after one failed attempt and skips focus/remount retries", async () => {
    const fetch = vi.fn(async () => { throw new Error("offline"); });
    const options = resourcePollingOptions(5_000);
    const { client, observer, unsubscribe, queryKey } = observe(fetch, options);
    try {
      await client.refetchQueries({ queryKey });
      const query = client.getQueryCache().find({ queryKey });
      if (!query) throw new Error("Missing resource query");
      expect(resourcePollingOptions(90_000).refetchInterval(query)).toBe(90_000);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(observer.getCurrentResult().data).toBe("before");
      expect(options.refetchInterval(query)).toBe(60_000);
      expect(options.refetchOnWindowFocus(query)).toBe(false);
      expect(options.refetchOnMount(query)).toBe(false);
      expect(resourcePollingOptions(0).refetchInterval(query)).toBe(false);
    } finally { unsubscribe(); }
  });
});
