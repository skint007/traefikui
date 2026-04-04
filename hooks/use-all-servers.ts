"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useServers, useLocalInstanceName } from "@/hooks/use-servers";
import { useUIStore } from "@/store/ui-store";
import type {
  TraefikRouter,
  TraefikService,
  TraefikMiddleware,
} from "@/lib/traefik/types";

async function fetchAPI<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

function withServerId(path: string, serverId: string | null): string {
  if (!serverId) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}serverId=${encodeURIComponent(serverId)}`;
}

export type ResourceType = "router" | "service" | "middleware";

export interface GlobalResource {
  name: string;
  type: ResourceType;
  status?: string;
  provider?: string;
  serverName: string;
  serverId: string | null;
  /** Extra detail shown in search results */
  detail?: string;
}

interface ServerTarget {
  id: string | null;
  name: string;
}

function routersToGlobal(
  routers: TraefikRouter[],
  server: ServerTarget
): GlobalResource[] {
  return routers.map((r) => ({
    name: r.name ?? "unknown",
    type: "router" as const,
    status: r.status,
    provider: r.provider,
    serverName: server.name,
    serverId: server.id,
    detail: r.rule,
  }));
}

function servicesToGlobal(
  services: TraefikService[],
  server: ServerTarget
): GlobalResource[] {
  return services.map((s) => ({
    name: s.name ?? "unknown",
    type: "service" as const,
    status: s.status,
    provider: s.provider,
    serverName: server.name,
    serverId: server.id,
    detail: s.type ?? "loadbalancer",
  }));
}

function middlewaresToGlobal(
  middlewares: TraefikMiddleware[],
  server: ServerTarget
): GlobalResource[] {
  return middlewares.map((m) => ({
    name: m.name ?? "unknown",
    type: "middleware" as const,
    status: m.status,
    provider: m.provider,
    serverName: server.name,
    serverId: server.id,
    detail: m.type,
  }));
}

export function useAllServersResources() {
  const { data: servers } = useServers();
  const { data: localName } = useLocalInstanceName();
  const pollingInterval = useUIStore((s) => s.pollingInterval);

  // Build list of all server targets (local + remote)
  const targets = useMemo<ServerTarget[]>(() => {
    const list: ServerTarget[] = [
      { id: null, name: localName ?? "Local Instance" },
    ];
    if (servers) {
      for (const srv of servers) {
        list.push({ id: srv.id, name: srv.name });
      }
    }
    return list;
  }, [servers, localName]);

  // Create queries for each server × resource type (3 queries per server)
  const queries = useQueries({
    queries: targets.flatMap((target) => [
      {
        queryKey: ["global", "routers", target.id],
        queryFn: () =>
          fetchAPI<TraefikRouter[]>(
            withServerId("/api/traefik/routers", target.id)
          ),
        refetchInterval: pollingInterval,
        meta: { target, type: "router" as const },
      },
      {
        queryKey: ["global", "services", target.id],
        queryFn: () =>
          fetchAPI<TraefikService[]>(
            withServerId("/api/traefik/services", target.id)
          ),
        refetchInterval: pollingInterval,
        meta: { target, type: "service" as const },
      },
      {
        queryKey: ["global", "middlewares", target.id],
        queryFn: () =>
          fetchAPI<TraefikMiddleware[]>(
            withServerId("/api/traefik/middlewares", target.id)
          ),
        refetchInterval: pollingInterval,
        meta: { target, type: "middleware" as const },
      },
    ]),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const isFetching = queries.some((q) => q.isFetching);

  // Combine all results into a flat list of GlobalResource
  const resources = useMemo(() => {
    const result: GlobalResource[] = [];
    // queries are in groups of 3 per target: [routers, services, middlewares]
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const base = i * 3;
      const routers = queries[base]?.data as TraefikRouter[] | undefined;
      const services = queries[base + 1]?.data as TraefikService[] | undefined;
      const middlewares = queries[base + 2]?.data as
        | TraefikMiddleware[]
        | undefined;

      if (routers) result.push(...routersToGlobal(routers, target));
      if (services) result.push(...servicesToGlobal(services, target));
      if (middlewares) result.push(...middlewaresToGlobal(middlewares, target));
    }
    return result;
  }, [targets, queries.map((q) => q.data)]);

  // Per-server counts
  const serverCounts = useMemo(() => {
    const counts: Record<
      string,
      { name: string; routers: number; services: number; middlewares: number; errors: number }
    > = {};
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const key = target.id ?? "local";
      const base = i * 3;
      const routers = queries[base]?.data as TraefikRouter[] | undefined;
      const services = queries[base + 1]?.data as TraefikService[] | undefined;
      const middlewares = queries[base + 2]?.data as
        | TraefikMiddleware[]
        | undefined;
      const hasError =
        queries[base]?.isError ||
        queries[base + 1]?.isError ||
        queries[base + 2]?.isError;

      counts[key] = {
        name: target.name,
        routers: routers?.length ?? 0,
        services: services?.length ?? 0,
        middlewares: middlewares?.length ?? 0,
        errors: hasError ? 1 : 0,
      };
    }
    return counts;
  }, [targets, queries.map((q) => q.data), queries.map((q) => q.isError)]);

  return { resources, serverCounts, targets, isLoading, isFetching };
}
