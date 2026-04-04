export interface TraefikRouter {
  entryPoints?: string[];
  middlewares?: string[];
  service?: string;
  rule?: string;
  ruleSyntax?: string;
  priority?: number;
  tls?: TraefikTLS;
  status?: string;
  using?: string[];
  name?: string;
  provider?: string;
  error?: string[];
}

export interface TraefikTLS {
  certResolver?: string;
  domains?: { main: string; sans?: string[] }[];
  options?: string;
  passthrough?: boolean;
}

export interface TraefikService {
  loadBalancer?: {
    servers?: { url: string }[];
    passHostHeader?: boolean;
    healthCheck?: {
      path?: string;
      interval?: string;
      timeout?: string;
    };
    sticky?: {
      cookie?: {
        name?: string;
        secure?: boolean;
        httpOnly?: boolean;
      };
    };
  };
  weighted?: {
    services?: { name: string; weight: number }[];
  };
  mirroring?: {
    service?: string;
    mirrors?: { name: string; percent: number }[];
  };
  status?: string;
  using?: string[];
  name?: string;
  provider?: string;
  type?: string;
  serverStatus?: Record<string, string>;
  error?: string[];
}

export interface TraefikMiddleware {
  addPrefix?: { prefix: string };
  stripPrefix?: { prefixes: string[] };
  stripPrefixRegex?: { regex: string[] };
  replacePath?: { path: string };
  replacePathRegex?: { regex: string; replacement: string };
  chain?: { middlewares: string[] };
  ipAllowList?: { sourceRange: string[]; ipStrategy?: { depth?: number } };
  headers?: {
    customRequestHeaders?: Record<string, string>;
    customResponseHeaders?: Record<string, string>;
    accessControlAllowMethods?: string[];
    accessControlAllowOriginList?: string[];
    accessControlMaxAge?: number;
    addVaryHeader?: boolean;
    frameDeny?: boolean;
    contentTypeNosniff?: boolean;
    browserXssFilter?: boolean;
    stsSeconds?: number;
    stsIncludeSubdomains?: boolean;
    stsPreload?: boolean;
    forceSTSHeader?: boolean;
    referrerPolicy?: string;
    contentSecurityPolicy?: string;
    permissionsPolicy?: string;
  };
  redirectScheme?: { scheme: string; permanent?: boolean };
  redirectRegex?: { regex: string; replacement: string; permanent?: boolean };
  basicAuth?: { users?: string[]; usersFile?: string; realm?: string };
  rateLimit?: { average?: number; burst?: number; period?: string };
  compress?: { excludedContentTypes?: string[] };
  status?: string;
  using?: string[];
  name?: string;
  provider?: string;
  type?: string;
  error?: string[];
}

export interface TraefikEntrypoint {
  address?: string;
  forwardedHeaders?: { insecure?: boolean; trustedIPs?: string[] };
  http?: { redirections?: { entryPoint?: { to: string; scheme: string; permanent: boolean } } };
  name?: string;
}

export interface TraefikOverview {
  http?: {
    routers?: { total: number; warnings: number; errors: number };
    services?: { total: number; warnings: number; errors: number };
    middlewares?: { total: number; warnings: number; errors: number };
  };
  tcp?: {
    routers?: { total: number; warnings: number; errors: number };
    services?: { total: number; warnings: number; errors: number };
    middlewares?: { total: number; warnings: number; errors: number };
  };
  udp?: {
    routers?: { total: number; warnings: number; errors: number };
    services?: { total: number; warnings: number; errors: number };
  };
}
