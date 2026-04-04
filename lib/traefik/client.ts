import type {
  TraefikRouter,
  TraefikService,
  TraefikMiddleware,
  TraefikEntrypoint,
  TraefikOverview,
} from "./types";

const TRAEFIK_API_URL =
  process.env.TRAEFIK_API_URL ?? "http://localhost:8080";

async function fetchTraefik<T>(path: string): Promise<T> {
  const res = await fetch(`${TRAEFIK_API_URL}/api${path}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `Traefik API error: ${res.status} ${res.statusText} for ${path}`
    );
  }

  return res.json() as Promise<T>;
}

export async function getRouters(): Promise<TraefikRouter[]> {
  return fetchTraefik<TraefikRouter[]>("/http/routers");
}

export async function getRouter(
  name: string
): Promise<TraefikRouter> {
  return fetchTraefik<TraefikRouter>(
    `/http/routers/${encodeURIComponent(name)}`
  );
}

export async function getServices(): Promise<TraefikService[]> {
  return fetchTraefik<TraefikService[]>("/http/services");
}

export async function getService(
  name: string
): Promise<TraefikService> {
  return fetchTraefik<TraefikService>(
    `/http/services/${encodeURIComponent(name)}`
  );
}

export async function getMiddlewares(): Promise<TraefikMiddleware[]> {
  return fetchTraefik<TraefikMiddleware[]>("/http/middlewares");
}

export async function getMiddleware(
  name: string
): Promise<TraefikMiddleware> {
  return fetchTraefik<TraefikMiddleware>(
    `/http/middlewares/${encodeURIComponent(name)}`
  );
}

export async function getEntrypoints(): Promise<TraefikEntrypoint[]> {
  return fetchTraefik<TraefikEntrypoint[]>("/entrypoints");
}

export async function getOverview(): Promise<TraefikOverview> {
  return fetchTraefik<TraefikOverview>("/overview");
}
