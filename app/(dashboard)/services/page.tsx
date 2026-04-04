"use client";

import { useMemo } from "react";
import { useServices, useResourceFileMap } from "@/hooks/use-traefik";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResourceTable,
  StatusBadge,
  ProviderBadge,
  sortByProviderThenName,
} from "@/components/dashboard/resource-table";
import { Badge } from "@/components/ui/badge";
import type { TraefikService } from "@/lib/traefik/types";

export default function ServicesPage() {
  const { data: services, isLoading, error } = useServices();
  const { data: fileMap } = useResourceFileMap();
  const sorted = useMemo(() => sortByProviderThenName(services ?? []), [services]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">HTTP Services</h1>
        <p className="text-muted-foreground">
          Manage and monitor Traefik HTTP services
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Services</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading services...</p>
          ) : error ? (
            <p className="text-sm text-destructive">
              Failed to load services: {error.message}
            </p>
          ) : (
            <ResourceTable<TraefikService>
              data={sorted}
              emptyMessage="No HTTP services found"
              columns={[
                {
                  header: "Name",
                  accessor: (s) => (
                    <span className="font-medium">{s.name}</span>
                  ),
                },
                {
                  header: "Type",
                  accessor: (s) => (
                    <Badge variant="outline">{s.type ?? "loadbalancer"}</Badge>
                  ),
                },
                {
                  header: "Servers",
                  accessor: (s) => {
                    const servers = s.loadBalancer?.servers;
                    if (!servers?.length) return <span className="text-muted-foreground">-</span>;
                    return (
                      <div className="space-y-0.5">
                        {servers.map((srv, i) => (
                          <div key={i} className="text-xs font-mono">
                            {srv.url}
                          </div>
                        ))}
                      </div>
                    );
                  },
                },
                {
                  header: "Health Check",
                  accessor: (s) => (
                    <Badge
                      variant={
                        s.loadBalancer?.healthCheck ? "success" : "secondary"
                      }
                    >
                      {s.loadBalancer?.healthCheck ? "Enabled" : "None"}
                    </Badge>
                  ),
                },
                {
                  header: "Status",
                  accessor: (s) => <StatusBadge status={s.status} />,
                },
                {
                  header: "Provider",
                  accessor: (s) => (
                    <ProviderBadge
                      provider={s.provider}
                      configFile={s.name ? fileMap?.[s.name] : undefined}
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
