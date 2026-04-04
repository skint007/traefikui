import * as yaml from "yaml";
import type { RouterFormData, ServiceFormData, MiddlewareFormData } from "@/lib/traefik/schemas";

export function routerToYaml(data: RouterFormData): string {
  const config = {
    http: {
      routers: {
        [data.name]: {
          rule: data.rule,
          entryPoints: data.entryPoints,
          service: data.service,
          ...(data.middlewares?.length ? { middlewares: data.middlewares } : {}),
          ...(data.tls ? { tls: data.tls } : {}),
          ...(data.priority ? { priority: data.priority } : {}),
        },
      },
    },
  };

  return yaml.stringify(config, { indent: 2 });
}

export function serviceToYaml(data: ServiceFormData): string {
  const config = {
    http: {
      services: {
        [data.name]: {
          loadBalancer: {
            servers: data.servers,
            ...(data.passHostHeader !== undefined
              ? { passHostHeader: data.passHostHeader }
              : {}),
            ...(data.healthCheck ? { healthCheck: data.healthCheck } : {}),
            ...(data.sticky ? { sticky: data.sticky } : {}),
          },
        },
      },
    },
  };

  return yaml.stringify(config, { indent: 2 });
}

export function middlewareToYaml(data: MiddlewareFormData): string {
  const middlewareConfig: Record<string, unknown> = {};

  switch (data.type) {
    case "headers":
      if (data.headers) middlewareConfig.headers = data.headers;
      break;
    case "ipAllowList":
      if (data.ipAllowList) middlewareConfig.ipAllowList = data.ipAllowList;
      break;
    case "redirectScheme":
      if (data.redirectScheme)
        middlewareConfig.redirectScheme = data.redirectScheme;
      break;
    case "stripPrefix":
      if (data.stripPrefix) middlewareConfig.stripPrefix = data.stripPrefix;
      break;
    case "addPrefix":
      if (data.addPrefix) middlewareConfig.addPrefix = data.addPrefix;
      break;
    case "rateLimit":
      if (data.rateLimit) middlewareConfig.rateLimit = data.rateLimit;
      break;
    case "compress":
      middlewareConfig.compress = {};
      break;
    case "chain":
      if (data.chain) middlewareConfig.chain = data.chain;
      break;
  }

  const config = {
    http: {
      middlewares: {
        [data.name]: middlewareConfig,
      },
    },
  };

  return yaml.stringify(config, { indent: 2 });
}
