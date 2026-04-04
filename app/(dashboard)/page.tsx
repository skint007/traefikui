"use client";

import { Route, Server, Layers, Globe } from "lucide-react";
import { StatusCard } from "@/components/dashboard/status-card";
import { useRouters, useServices, useMiddlewares, useEntrypoints } from "@/hooks/use-traefik";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const { data: routers, isLoading: loadingRouters, error: routersError } = useRouters();
  const { data: services, isLoading: loadingServices, error: servicesError } = useServices();
  const { data: middlewares, isLoading: loadingMiddlewares } = useMiddlewares();
  const { data: entrypoints, isLoading: loadingEntrypoints } = useEntrypoints();

  const isLoading = loadingRouters || loadingServices || loadingMiddlewares || loadingEntrypoints;
  const hasError = routersError || servicesError;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your Traefik instance
        </p>
      </div>

      {hasError && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              Unable to connect to Traefik API. Check that TRAEFIK_API_URL is configured correctly.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatusCard
          title="Routers"
          value={isLoading ? "..." : (routers?.length ?? 0)}
          description={
            routers
              ? `${routers.filter((r) => r.status === "enabled").length} enabled`
              : undefined
          }
          icon={Route}
          variant="default"
        />
        <StatusCard
          title="Services"
          value={isLoading ? "..." : (services?.length ?? 0)}
          description={
            services
              ? `${services.filter((s) => s.status === "enabled").length} enabled`
              : undefined
          }
          icon={Server}
          variant="default"
        />
        <StatusCard
          title="Middlewares"
          value={isLoading ? "..." : (middlewares?.length ?? 0)}
          icon={Layers}
          variant="default"
        />
        <StatusCard
          title="Entrypoints"
          value={isLoading ? "..." : (entrypoints?.length ?? 0)}
          icon={Globe}
          variant="default"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Routers</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRouters ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : !routers?.length ? (
              <p className="text-sm text-muted-foreground">No routers found</p>
            ) : (
              <div className="space-y-3">
                {routers.slice(0, 5).map((router) => (
                  <div
                    key={router.name}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{router.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {router.rule}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          router.status === "enabled" ? "success" : "destructive"
                        }
                      >
                        {router.status}
                      </Badge>
                      <Badge variant="outline">{router.provider}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Entrypoints</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEntrypoints ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : !entrypoints?.length ? (
              <p className="text-sm text-muted-foreground">
                No entrypoints found
              </p>
            ) : (
              <div className="space-y-3">
                {entrypoints.map((ep) => (
                  <div
                    key={ep.name}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{ep.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {ep.address}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
