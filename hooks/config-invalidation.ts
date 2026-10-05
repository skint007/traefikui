import { focusManager, type QueryClient } from "@tanstack/react-query";

const BATCH_DELAY_MS = 500;
const MAX_BATCH_DELAY_MS = 1_500;
type RefreshBatch = {
  firstEventAt: number;
  timer: ReturnType<typeof setTimeout>;
  promise: Promise<void>;
  resolve: () => void;
  reject: (reason: unknown) => void;
};
const batchesByClient = new WeakMap<QueryClient, Map<string | null, RefreshBatch>>();

/** Saves and local watcher events share one bounded refresh batch per server. */
export function invalidateServerConfig(
  queryClient: QueryClient,
  serverId: string | null
) {
  let batches = batchesByClient.get(queryClient);
  if (!batches) {
    batches = new Map();
    batchesByClient.set(queryClient, batches);
  }
  const predicate = ({ queryKey }: { queryKey: readonly unknown[] }) =>
    (queryKey[0] === "config" || queryKey[0] === "traefik") &&
    queryKey[queryKey.length - 1] === serverId;
  const previous = batches.get(serverId);
  if (previous) clearTimeout(previous.timer);
  const deferred = previous ?? Promise.withResolvers<void>();
  const firstEventAt = previous?.firstEventAt ?? Date.now();
  const delay = Math.min(BATCH_DELAY_MS, Math.max(0, firstEventAt + MAX_BATCH_DELAY_MS - Date.now()));
  const timer = setTimeout(async () => {
    batches.delete(serverId);
    try {
      // Let an existing snapshot finish before requesting the changed state.
      // Cancelling on each event would repeatedly restart the same request.
      const pending = queryClient.getQueryCache().findAll({ predicate })
        .filter((query) => query.state.fetchStatus === "fetching")
        .map((query) => query.promise);
      await Promise.allSettled(pending);
      await queryClient.invalidateQueries({
        predicate,
        refetchType: focusManager.isFocused() ? "active" : "none",
      }, { cancelRefetch: false });
      deferred.resolve();
    } catch (error) {
      deferred.reject(error);
    }
  }, delay);
  batches.set(serverId, { ...deferred, firstEventAt, timer });
  return deferred.promise;
}
