import { withRequestDeadline } from "@/lib/request-deadline";
import type {
  TraefikRouter,
  TraefikService,
  TraefikMiddleware,
  TraefikEntrypoint,
  TraefikOverview,
} from "./types";

const TRAEFIK_API_URL =
  process.env.TRAEFIK_API_URL ?? "http://localhost:8080";

async function fetchTraefik<T>(path: string, incomingSignal?: AbortSignal): Promise<T> {
  return withRequestDeadline(async (signal) => {
    const res = await fetch(`${TRAEFIK_API_URL}/api${path}`, {
      cache: "no-store",
      signal,
    });

    if (!res.ok) {
      await res.body?.cancel();
      throw new Error(
        `Traefik API error: ${res.status} ${res.statusText} for ${path}`
      );
    }

    return res.json();
  }, { signal: incomingSignal });
}

export async function getRouters(signal?: AbortSignal): Promise<TraefikRouter[]> {
  return fetchTraefik<TraefikRouter[]>("/http/routers", signal);
}

export async function getRouter(
  name: string,
  signal?: AbortSignal,
): Promise<TraefikRouter> {
  return fetchTraefik<TraefikRouter>(
    `/http/routers/${encodeURIComponent(name)}`,
    signal,
  );
}

export async function getServices(signal?: AbortSignal): Promise<TraefikService[]> {
  return fetchTraefik<TraefikService[]>("/http/services", signal);
}

export async function getService(
  name: string,
  signal?: AbortSignal,
): Promise<TraefikService> {
  return fetchTraefik<TraefikService>(
    `/http/services/${encodeURIComponent(name)}`,
    signal,
  );
}

export async function getMiddlewares(signal?: AbortSignal): Promise<TraefikMiddleware[]> {
  return fetchTraefik<TraefikMiddleware[]>("/http/middlewares", signal);
}

export async function getMiddleware(
  name: string,
  signal?: AbortSignal,
): Promise<TraefikMiddleware> {
  return fetchTraefik<TraefikMiddleware>(
    `/http/middlewares/${encodeURIComponent(name)}`,
    signal,
  );
}

export async function getEntrypoints(signal?: AbortSignal): Promise<TraefikEntrypoint[]> {
  return fetchTraefik<TraefikEntrypoint[]>("/entrypoints", signal);
}

export async function getOverview(signal?: AbortSignal): Promise<TraefikOverview> {
  return fetchTraefik<TraefikOverview>("/overview", signal);
}
