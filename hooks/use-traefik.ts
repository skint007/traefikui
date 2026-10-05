"use client";

import { useQuery } from "@tanstack/react-query";
import { useUIStore } from "@/store/ui-store";
import { traefikQueries } from "@/hooks/traefik-queries";
import { resourcePollingOptions } from "@/hooks/refresh-policy";

export function useRouters() {
  const pollingInterval = useUIStore((s) => s.pollingInterval);
  const activeServerId = useUIStore((s) => s.activeServerId);
  return useQuery({ ...traefikQueries.routers(activeServerId), ...resourcePollingOptions(pollingInterval) });
}

export function useServices() {
  const pollingInterval = useUIStore((s) => s.pollingInterval);
  const activeServerId = useUIStore((s) => s.activeServerId);
  return useQuery({ ...traefikQueries.services(activeServerId), ...resourcePollingOptions(pollingInterval) });
}

export function useMiddlewares() {
  const pollingInterval = useUIStore((s) => s.pollingInterval);
  const activeServerId = useUIStore((s) => s.activeServerId);
  return useQuery({ ...traefikQueries.middlewares(activeServerId), ...resourcePollingOptions(pollingInterval) });
}

export function useEntrypoints() {
  const pollingInterval = useUIStore((s) => s.pollingInterval);
  const activeServerId = useUIStore((s) => s.activeServerId);
  return useQuery({ ...traefikQueries.entrypoints(activeServerId), ...resourcePollingOptions(pollingInterval) });
}

export function useOverview() {
  const pollingInterval = useUIStore((s) => s.pollingInterval);
  const activeServerId = useUIStore((s) => s.activeServerId);
  return useQuery({ ...traefikQueries.overview(activeServerId), ...resourcePollingOptions(pollingInterval) });
}

/** Maps Traefik resource names (e.g. "myrouter@file") to config file paths. */
export function useResourceFileMap() {
  const activeServerId = useUIStore((s) => s.activeServerId);
  return useQuery(traefikQueries.resourceMap(activeServerId));
}
