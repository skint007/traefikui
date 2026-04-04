import { z } from "zod";

export const routerFormSchema = z.object({
  name: z.string().min(1, "Router name is required"),
  rule: z.string().min(1, "Rule is required"),
  entryPoints: z.array(z.string()).min(1, "At least one entrypoint is required"),
  service: z.string().min(1, "Service is required"),
  middlewares: z.array(z.string()).optional(),
  tls: z
    .object({
      certResolver: z.string().optional(),
      domains: z
        .array(
          z.object({
            main: z.string(),
            sans: z.array(z.string()).optional(),
          })
        )
        .optional(),
    })
    .optional(),
  priority: z.number().int().positive().optional(),
});

export type RouterFormData = z.infer<typeof routerFormSchema>;

export const serviceFormSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  servers: z
    .array(
      z.object({
        url: z.string().url("Invalid server URL"),
      })
    )
    .min(1, "At least one server is required"),
  passHostHeader: z.boolean().optional(),
  healthCheck: z
    .object({
      path: z.string().optional(),
      interval: z.string().optional(),
      timeout: z.string().optional(),
    })
    .optional(),
  sticky: z
    .object({
      cookie: z.object({
        name: z.string().optional(),
        secure: z.boolean().optional(),
        httpOnly: z.boolean().optional(),
      }),
    })
    .optional(),
});

export type ServiceFormData = z.infer<typeof serviceFormSchema>;

export const middlewareFormSchema = z.object({
  name: z.string().min(1, "Middleware name is required"),
  type: z.enum([
    "headers",
    "ipAllowList",
    "redirectScheme",
    "redirectRegex",
    "stripPrefix",
    "addPrefix",
    "basicAuth",
    "rateLimit",
    "compress",
    "chain",
  ]),
  // Headers
  headers: z
    .object({
      frameDeny: z.boolean().optional(),
      contentTypeNosniff: z.boolean().optional(),
      browserXssFilter: z.boolean().optional(),
      stsSeconds: z.number().optional(),
      stsIncludeSubdomains: z.boolean().optional(),
      stsPreload: z.boolean().optional(),
      forceSTSHeader: z.boolean().optional(),
      referrerPolicy: z.string().optional(),
      contentSecurityPolicy: z.string().optional(),
      permissionsPolicy: z.string().optional(),
      customRequestHeaders: z.record(z.string()).optional(),
      customResponseHeaders: z.record(z.string()).optional(),
    })
    .optional(),
  // IP Allow List
  ipAllowList: z
    .object({
      sourceRange: z.array(z.string()).optional(),
    })
    .optional(),
  // Redirect
  redirectScheme: z
    .object({
      scheme: z.string(),
      permanent: z.boolean().optional(),
    })
    .optional(),
  // Strip Prefix
  stripPrefix: z
    .object({
      prefixes: z.array(z.string()),
    })
    .optional(),
  // Add Prefix
  addPrefix: z
    .object({
      prefix: z.string(),
    })
    .optional(),
  // Rate Limit
  rateLimit: z
    .object({
      average: z.number().optional(),
      burst: z.number().optional(),
      period: z.string().optional(),
    })
    .optional(),
  // Chain
  chain: z
    .object({
      middlewares: z.array(z.string()),
    })
    .optional(),
});

export type MiddlewareFormData = z.infer<typeof middlewareFormSchema>;
