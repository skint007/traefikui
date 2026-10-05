import { queryOptions } from "@tanstack/react-query";
import { fetchAPI, resourceRetryOptions } from "@/lib/client-request";
import type {
  TraefikRouter,
  TraefikService,
  TraefikMiddleware,
  TraefikEntrypoint,
  TraefikOverview,
} from "@/lib/traefik/types";

export function withServerId(path: string, serverId: string | null): string {
  if (!serverId) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}serverId=${encodeURIComponent(serverId)}`;
}

// Global and individual views use the same raw cache entries. View-specific
// projections belong in select, so they never replace the cached API response.
export const traefikQueries = {
  routers: (serverId: string | null) => queryOptions({
    ...resourceRetryOptions,
    queryKey: ["traefik", "routers", serverId],
    queryFn: ({ signal }) => fetchAPI<TraefikRouter[]>(withServerId("/api/traefik/routers", serverId), { signal }),
  }),
  services: (serverId: string | null) => queryOptions({
    ...resourceRetryOptions,
    queryKey: ["traefik", "services", serverId],
    queryFn: ({ signal }) => fetchAPI<TraefikService[]>(withServerId("/api/traefik/services", serverId), { signal }),
  }),
  middlewares: (serverId: string | null) => queryOptions({
    ...resourceRetryOptions,
    queryKey: ["traefik", "middlewares", serverId],
    queryFn: ({ signal }) => fetchAPI<TraefikMiddleware[]>(withServerId("/api/traefik/middlewares", serverId), { signal }),
  }),
  entrypoints: (serverId: string | null) => queryOptions({
    ...resourceRetryOptions,
    queryKey: ["traefik", "entrypoints", serverId],
    queryFn: ({ signal }) => fetchAPI<TraefikEntrypoint[]>(withServerId("/api/traefik/entrypoints", serverId), { signal }),
  }),
  overview: (serverId: string | null) => queryOptions({
    ...resourceRetryOptions,
    queryKey: ["traefik", "overview", serverId],
    queryFn: ({ signal }) => fetchAPI<TraefikOverview>(withServerId("/api/traefik/overview", serverId), { signal }),
  }),
  resourceMap: (serverId: string | null) => queryOptions({
    ...resourceRetryOptions,
    queryKey: ["config", "resource-map", serverId],
    queryFn: ({ signal }) => fetchAPI<Record<string, string>>(withServerId("/api/config/resource-map", serverId), { signal }),
  }),
};
