import type { Query } from "@tanstack/react-query";

export const DEFAULT_POLLING_INTERVAL_MS = 15_000;
export const FAILED_POLLING_INTERVAL_MS = 60_000;

/** Polling also observes remote changes and providers outside the local watcher. */
export function resourcePollingOptions(pollingInterval: number) {
  return {
    staleTime: pollingInterval,
    retry: false,
    retryOnMount: false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: (query: Pick<Query, "state">) => query.state.status !== "error",
    refetchOnMount: (query: Pick<Query, "state">) => query.state.status !== "error",
    refetchInterval: (query: Pick<Query, "state">) =>
      pollingInterval <= 0 ? false : query.state.status === "error"
        ? Math.max(pollingInterval, FAILED_POLLING_INTERVAL_MS)
        : pollingInterval,
  };
}
