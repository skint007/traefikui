import { queryOptions } from "@tanstack/react-query";
import type {
  TraefikRouter,
  TraefikService,
  TraefikMiddleware,
  TraefikEntrypoint,
  TraefikOverview,
} from "@/lib/traefik/types";

async function fetchAPI<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export function withServerId(path: string, serverId: string | null): string {
  if (!serverId) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}serverId=${encodeURIComponent(serverId)}`;
}

// Global and individual views use the same raw cache entries. View-specific
// projections belong in select, so they never replace the cached API response.
export const traefikQueries = {
  routers: (serverId: string | null) => queryOptions({
    queryKey: ["traefik", "routers", serverId],
    queryFn: () => fetchAPI<TraefikRouter[]>(withServerId("/api/traefik/routers", serverId)),
  }),
  services: (serverId: string | null) => queryOptions({
    queryKey: ["traefik", "services", serverId],
    queryFn: () => fetchAPI<TraefikService[]>(withServerId("/api/traefik/services", serverId)),
  }),
  middlewares: (serverId: string | null) => queryOptions({
    queryKey: ["traefik", "middlewares", serverId],
    queryFn: () => fetchAPI<TraefikMiddleware[]>(withServerId("/api/traefik/middlewares", serverId)),
  }),
  entrypoints: (serverId: string | null) => queryOptions({
    queryKey: ["traefik", "entrypoints", serverId],
    queryFn: () => fetchAPI<TraefikEntrypoint[]>(withServerId("/api/traefik/entrypoints", serverId)),
  }),
  overview: (serverId: string | null) => queryOptions({
    queryKey: ["traefik", "overview", serverId],
    queryFn: () => fetchAPI<TraefikOverview>(withServerId("/api/traefik/overview", serverId)),
  }),
  resourceMap: (serverId: string | null) => queryOptions({
    queryKey: ["config", "resource-map", serverId],
    queryFn: () => fetchAPI<Record<string, string>>(withServerId("/api/config/resource-map", serverId)),
  }),
};
