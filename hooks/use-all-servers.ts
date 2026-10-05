"use client";

import { useMemo } from "react";
import {
  useQueries,
  type QueryObserverResult,
} from "@tanstack/react-query";
import { useServers, useLocalInstanceName } from "@/hooks/use-servers";
import { useUIStore } from "@/store/ui-store";
import type {
  TraefikRouter,
  TraefikService,
  TraefikMiddleware,
} from "@/lib/traefik/types";

import { traefikQueries } from "@/hooks/traefik-queries";

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

export interface ServerTarget {
  id: string | null;
  name: string;
}

type GlobalQueryState = Pick<
  QueryObserverResult<unknown>,
  | "data"
  | "dataUpdatedAt"
  | "errorUpdatedAt"
  | "isError"
  | "isFetched"
  | "isLoading"
>;

export function isGlobalResourcesLoading(
  queries: readonly GlobalQueryState[]
): boolean {
  const hasSuccessfulResult = queries.some(
    (query) => query.data !== undefined
  );
  const hasPendingInitialRequest = queries.some((query) => !query.isFetched);

  return !hasSuccessfulResult && hasPendingInitialRequest;
}

export function hasGlobalQueryError(
  query: GlobalQueryState | undefined
): boolean {
  if (!query) return false;

  return query.isError || query.errorUpdatedAt > query.dataUpdatedAt;
}

function routersToGlobal(
  routers: TraefikRouter[],
  server: ServerTarget
): GlobalResource[] {
  return routers.map((r) => ({
    name: r.name ?? "unknown",
    type: "router",
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
    type: "service",
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
    type: "middleware",
    status: m.status,
    provider: m.provider,
    serverName: server.name,
    serverId: server.id,
    detail: m.type,
  }));
}

export function globalResourceQueries(targets: ServerTarget[], pollingInterval: number) {
  return targets.flatMap((target) => [
    {
      ...traefikQueries.routers(target.id),
      select: (data: TraefikRouter[]) => routersToGlobal(data, target),
      refetchInterval: pollingInterval,
    },
    {
      ...traefikQueries.services(target.id),
      select: (data: TraefikService[]) => servicesToGlobal(data, target),
      refetchInterval: pollingInterval,
    },
    {
      ...traefikQueries.middlewares(target.id),
      select: (data: TraefikMiddleware[]) => middlewaresToGlobal(data, target),
      refetchInterval: pollingInterval,
    },
  ]);
}

type ServerCounts = Record<string, {
  name: string;
  routers: number;
  services: number;
  middlewares: number;
  errors: number;
}>;

// Observer status changes need fresh loading/error flags, but only changed data
// should rebuild the resource list. Each hook instance owns its previous inputs.
export function createGlobalResourceCombiner(targets: ServerTarget[]) {
  let previousData: (GlobalResource[] | undefined)[] = [];
  let previousErrors: boolean[] = [];
  let resources: GlobalResource[] | undefined;
  let serverCounts: ServerCounts | undefined;

  return (queries: readonly QueryObserverResult<GlobalResource[]>[]) => {
    const dataChanged = resources === undefined ||
      queries.length !== previousData.length ||
      queries.some((query, index) => query.data !== previousData[index]);
    const errors = queries.map(hasGlobalQueryError);
    const errorsChanged = errors.length !== previousErrors.length ||
      errors.some((error, index) => error !== previousErrors[index]);

    if (dataChanged) {
      previousData = queries.map((query) => query.data);
      resources = previousData.flatMap((data) => data ?? []);
    }
    if (dataChanged || errorsChanged || serverCounts === undefined) {
      serverCounts = {};
      for (const [index, target] of targets.entries()) {
        const base = index * 3;
        serverCounts[target.id ?? "local"] = {
          name: target.name,
          routers: previousData[base]?.length ?? 0,
          services: previousData[base + 1]?.length ?? 0,
          middlewares: previousData[base + 2]?.length ?? 0,
          errors: errors.slice(base, base + 3).some(Boolean) ? 1 : 0,
        };
      }
      previousErrors = errors;
    }

    return {
      resources: resources ?? [],
      serverCounts,
      isLoading: isGlobalResourcesLoading(queries),
      isFetching: queries.some((query) => query.isFetching),
    };
  };
}

export function useAllServersResources() {
  const { data: servers } = useServers();
  const { data: localName } = useLocalInstanceName();
  const pollingInterval = useUIStore((s) => s.pollingInterval);

  const targets = useMemo<ServerTarget[]>(() => [
    { id: null, name: localName ?? "Local Instance" },
    ...(servers ?? []).map((server) => ({ id: server.id, name: server.name })),
  ], [servers, localName]);
  const queries = useMemo(
    () => globalResourceQueries(targets, pollingInterval),
    [targets, pollingInterval]
  );
  const combine = useMemo(() => createGlobalResourceCombiner(targets), [targets]);
  const combined = useQueries({ queries, combine });

  return { ...combined, targets };
}
