"use client";

import { useQuery } from "@tanstack/react-query";
import { useUIStore } from "@/store/ui-store";
import type {
  TraefikRouter,
  TraefikService,
  TraefikMiddleware,
  TraefikEntrypoint,
  TraefikOverview,
} from "@/lib/traefik/types";

async function fetchAPI<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function withServerId(path: string, serverId: string | null): string {
  if (!serverId) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}serverId=${encodeURIComponent(serverId)}`;
}

export function useRouters() {
  const pollingInterval = useUIStore((s) => s.pollingInterval);
  const activeServerId = useUIStore((s) => s.activeServerId);
  return useQuery<TraefikRouter[]>({
    queryKey: ["traefik", "routers", activeServerId],
    queryFn: () => fetchAPI(withServerId("/api/traefik/routers", activeServerId)),
    refetchInterval: pollingInterval,
  });
}

export function useServices() {
  const pollingInterval = useUIStore((s) => s.pollingInterval);
  const activeServerId = useUIStore((s) => s.activeServerId);
  return useQuery<TraefikService[]>({
    queryKey: ["traefik", "services", activeServerId],
    queryFn: () => fetchAPI(withServerId("/api/traefik/services", activeServerId)),
    refetchInterval: pollingInterval,
  });
}

export function useMiddlewares() {
  const pollingInterval = useUIStore((s) => s.pollingInterval);
  const activeServerId = useUIStore((s) => s.activeServerId);
  return useQuery<TraefikMiddleware[]>({
    queryKey: ["traefik", "middlewares", activeServerId],
    queryFn: () => fetchAPI(withServerId("/api/traefik/middlewares", activeServerId)),
    refetchInterval: pollingInterval,
  });
}

export function useEntrypoints() {
  const pollingInterval = useUIStore((s) => s.pollingInterval);
  const activeServerId = useUIStore((s) => s.activeServerId);
  return useQuery<TraefikEntrypoint[]>({
    queryKey: ["traefik", "entrypoints", activeServerId],
    queryFn: () => fetchAPI(withServerId("/api/traefik/entrypoints", activeServerId)),
    refetchInterval: pollingInterval,
  });
}

export function useOverview() {
  const pollingInterval = useUIStore((s) => s.pollingInterval);
  const activeServerId = useUIStore((s) => s.activeServerId);
  return useQuery<TraefikOverview>({
    queryKey: ["traefik", "overview", activeServerId],
    queryFn: () => fetchAPI(withServerId("/api/traefik/overview", activeServerId)),
    refetchInterval: pollingInterval,
  });
}

/**
 * Maps Traefik resource names (e.g. "myrouter@file") to config file paths.
 */
export function useResourceFileMap() {
  const activeServerId = useUIStore((s) => s.activeServerId);
  return useQuery<Record<string, string>>({
    queryKey: ["config", "resource-map", activeServerId],
    queryFn: () =>
      fetchAPI(withServerId("/api/config/resource-map", activeServerId)),
  });
}
