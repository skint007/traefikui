"use client";

import { useQuery } from "@tanstack/react-query";
import { useUIStore } from "@/store/ui-store";
import { traefikQueries } from "@/hooks/traefik-queries";

export function useRouters() {
  const pollingInterval = useUIStore((s) => s.pollingInterval);
  const activeServerId = useUIStore((s) => s.activeServerId);
  return useQuery({ ...traefikQueries.routers(activeServerId), refetchInterval: pollingInterval });
}

export function useServices() {
  const pollingInterval = useUIStore((s) => s.pollingInterval);
  const activeServerId = useUIStore((s) => s.activeServerId);
  return useQuery({ ...traefikQueries.services(activeServerId), refetchInterval: pollingInterval });
}

export function useMiddlewares() {
  const pollingInterval = useUIStore((s) => s.pollingInterval);
  const activeServerId = useUIStore((s) => s.activeServerId);
  return useQuery({ ...traefikQueries.middlewares(activeServerId), refetchInterval: pollingInterval });
}

export function useEntrypoints() {
  const pollingInterval = useUIStore((s) => s.pollingInterval);
  const activeServerId = useUIStore((s) => s.activeServerId);
  return useQuery({ ...traefikQueries.entrypoints(activeServerId), refetchInterval: pollingInterval });
}

export function useOverview() {
  const pollingInterval = useUIStore((s) => s.pollingInterval);
  const activeServerId = useUIStore((s) => s.activeServerId);
  return useQuery({ ...traefikQueries.overview(activeServerId), refetchInterval: pollingInterval });
}

/** Maps Traefik resource names (e.g. "myrouter@file") to config file paths. */
export function useResourceFileMap() {
  const activeServerId = useUIStore((s) => s.activeServerId);
  return useQuery(traefikQueries.resourceMap(activeServerId));
}
