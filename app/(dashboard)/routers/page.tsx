"use client";

import { useMemo } from "react";
import { useRouters, useResourceFileMap } from "@/hooks/use-traefik";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResourceTable,
  StatusBadge,
  ProviderBadge,
  sortByProviderThenName,
} from "@/components/dashboard/resource-table";
import { Badge } from "@/components/ui/badge";
import type { TraefikRouter } from "@/lib/traefik/types";

export default function RoutersPage() {
  const { data: routers, isLoading, error } = useRouters();
  const { data: fileMap } = useResourceFileMap();
  const sorted = useMemo(() => sortByProviderThenName(routers ?? []), [routers]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">HTTP Routers</h1>
        <p className="text-muted-foreground">
          Manage and monitor Traefik HTTP routers
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Routers</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading routers...</p>
          ) : error ? (
            <p className="text-sm text-destructive">
              Failed to load routers: {error.message}
            </p>
          ) : (
            <ResourceTable<TraefikRouter>
              data={sorted}
              emptyMessage="No HTTP routers found"
              columns={[
                {
                  header: "Name",
                  accessor: (r) => (
                    <span className="font-medium">{r.name}</span>
                  ),
                },
                {
                  header: "Rule",
                  accessor: (r) => (
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {r.rule}
                    </code>
                  ),
                },
                {
                  header: "Entrypoints",
                  accessor: (r) => (
                    <div className="flex gap-1 flex-wrap">
                      {r.entryPoints?.map((ep) => (
                        <Badge key={ep} variant="secondary" className="text-xs">
                          {ep}
                        </Badge>
                      ))}
                    </div>
                  ),
                },
                {
                  header: "Service",
                  accessor: (r) => (
                    <span className="text-sm">{r.service}</span>
                  ),
                },
                {
                  header: "TLS",
                  accessor: (r) => (
                    <Badge variant={r.tls ? "success" : "secondary"}>
                      {r.tls ? "Yes" : "No"}
                    </Badge>
                  ),
                },
                {
                  header: "Status",
                  accessor: (r) => <StatusBadge status={r.status} />,
                },
                {
                  header: "Provider",
                  accessor: (r) => (
                    <ProviderBadge
                      provider={r.provider}
                      configFile={r.name ? fileMap?.[r.name] : undefined}
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
