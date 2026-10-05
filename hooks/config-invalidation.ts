import type { QueryClient } from "@tanstack/react-query";

/** Refresh configuration and resource views for the server that changed. */
export function invalidateServerConfig(
  queryClient: QueryClient,
  serverId: string | null
) {
  return queryClient.invalidateQueries({
    predicate: ({ queryKey }) =>
      (queryKey[0] === "config" || queryKey[0] === "traefik") &&
      queryKey[queryKey.length - 1] === serverId,
  });
}
