"use client";

import { useMemo } from "react";
import { useMiddlewares, useResourceFileMap } from "@/hooks/use-traefik";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResourceTable,
  StatusBadge,
  ProviderBadge,
  sortByProviderThenName,
} from "@/components/dashboard/resource-table";
import type { TraefikMiddleware } from "@/lib/traefik/types";

function getMiddlewareType(m: TraefikMiddleware): string {
  if (m.type) return m.type;
  if (m.addPrefix) return "addPrefix";
  if (m.stripPrefix) return "stripPrefix";
  if (m.headers) return "headers";
  if (m.ipAllowList) return "ipAllowList";
  if (m.redirectScheme) return "redirectScheme";
  if (m.redirectRegex) return "redirectRegex";
  if (m.basicAuth) return "basicAuth";
  if (m.rateLimit) return "rateLimit";
  if (m.compress) return "compress";
  if (m.chain) return "chain";
  return "unknown";
}

export default function MiddlewaresPage() {
  const { data: middlewares, isLoading, error } = useMiddlewares();
  const { data: fileMap } = useResourceFileMap();
  const sorted = useMemo(() => sortByProviderThenName(middlewares ?? []), [middlewares]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">HTTP Middlewares</h1>
        <p className="text-muted-foreground">
          Manage and monitor Traefik HTTP middlewares
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Middlewares</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading middlewares...
            </p>
          ) : error ? (
            <p className="text-sm text-destructive">
              Failed to load middlewares: {error.message}
            </p>
          ) : (
            <ResourceTable<TraefikMiddleware>
              data={sorted}
              emptyMessage="No HTTP middlewares found"
              columns={[
                {
                  header: "Name",
                  accessor: (m) => (
                    <span className="font-medium">{m.name}</span>
                  ),
                },
                {
                  header: "Type",
                  accessor: (m) => (
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {getMiddlewareType(m)}
                    </code>
                  ),
                },
                {
                  header: "Status",
                  accessor: (m) => <StatusBadge status={m.status} />,
                },
                {
                  header: "Provider",
                  accessor: (m) => (
                    <ProviderBadge
                      provider={m.provider}
                      configFile={m.name ? fileMap?.[m.name] : undefined}
                    />
                  ),
                },
              ]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
