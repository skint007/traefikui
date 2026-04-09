"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Route,
  Server,
  Layers,
  Globe,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusCard } from "@/components/dashboard/status-card";
import { StatusBadge } from "@/components/dashboard/resource-table";
import {
  useAllServersResources,
  type GlobalResource,
  type ResourceType,
} from "@/hooks/use-all-servers";
import { useUIStore } from "@/store/ui-store";

const TYPE_CONFIG: Record<
  ResourceType,
  { label: string; icon: typeof Route; color: string; page: string }
> = {
  router: {
    label: "Router",
    icon: Route,
    color: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    page: "/routers",
  },
  service: {
    label: "Service",
    icon: Server,
    color: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
    page: "/services",
  },
  middleware: {
    label: "Middleware",
    icon: Layers,
    color: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    page: "/middlewares",
  },
};

function TypeBadge({ type }: { type: ResourceType }) {
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`gap-1 ${config.color} border-0`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function ServerBadge({ name }: { name: string }) {
  return (
    <Badge variant="secondary" className="gap-1 text-xs">
      <Globe className="h-3 w-3" />
      {name}
    </Badge>
  );
}

type FilterType = ResourceType | "all";

export default function GlobalOverviewPage() {
  const { resources, serverCounts, isLoading } = useAllServersResources();
  const setActiveServerId = useUIStore((s) => s.setActiveServerId);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");

  const filtered = useMemo(() => {
    let list = resources;

    if (typeFilter !== "all") {
      list = list.filter((r) => r.type === typeFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.detail?.toLowerCase().includes(q) ||
          r.serverName.toLowerCase().includes(q) ||
          r.provider?.toLowerCase().includes(q)
      );
    }

    // Sort by server name, then type, then resource name
    return [...list].sort((a, b) => {
      const cmpServer = a.serverName.localeCompare(b.serverName);
      if (cmpServer !== 0) return cmpServer;
      const cmpType = a.type.localeCompare(b.type);
      if (cmpType !== 0) return cmpType;
      return a.name.localeCompare(b.name);
    });
  }, [resources, search, typeFilter]);

  const totalRouters = Object.values(serverCounts).reduce(
    (sum, c) => sum + c.routers,
    0
  );
  const totalServices = Object.values(serverCounts).reduce(
    (sum, c) => sum + c.services,
    0
  );
  const totalMiddlewares = Object.values(serverCounts).reduce(
    (sum, c) => sum + c.middlewares,
    0
  );
  const totalServers = Object.keys(serverCounts).length;

  function handleJump(resource: GlobalResource) {
    setActiveServerId(resource.serverId);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Global Overview</h1>
        <p className="text-muted-foreground">
          All resources across all Traefik instances
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatusCard
          title="Total Routers"
          value={isLoading ? "..." : totalRouters}
          description={`Across ${totalServers} instance${totalServers !== 1 ? "s" : ""}`}
          icon={Route}
          variant="default"
        />
        <StatusCard
          title="Total Services"
          value={isLoading ? "..." : totalServices}
          description={`Across ${totalServers} instance${totalServers !== 1 ? "s" : ""}`}
          icon={Server}
          variant="default"
        />
        <StatusCard
          title="Total Middlewares"
          value={isLoading ? "..." : totalMiddlewares}
          description={`Across ${totalServers} instance${totalServers !== 1 ? "s" : ""}`}
          icon={Layers}
          variant="default"
        />
        <StatusCard
          title="Instances"
          value={isLoading ? "..." : totalServers}
          description={`${Object.values(serverCounts).filter((c) => !c.errors).length} healthy`}
          icon={Globe}
          variant="default"
        />
      </div>

      {/* Per-server breakdown */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(serverCounts).map(([key, counts]) => (
          <Card key={key}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
                {counts.name}
                {counts.errors > 0 && (
                  <Badge variant="destructive" className="ml-auto text-xs">
                    Error
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Route className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-muted-foreground">Routers:</span>
                  <span className="font-medium">{counts.routers}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5 text-purple-500" />
                  <span className="text-muted-foreground">Services:</span>
                  <span className="font-medium">{counts.services}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-muted-foreground">Middlewares:</span>
                  <span className="font-medium">{counts.middlewares}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and filter */}
      <Card>
        <CardHeader>
          <CardTitle>Search Resources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, rule, server, or provider..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                  onClick={() => setSearch("")}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <div className="flex gap-1.5">
              {(["all", "router", "service", "middleware"] as const).map(
                (t) => (
                  <Button
                    key={t}
                    variant={typeFilter === t ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTypeFilter(t)}
                  >
                    {t === "all" ? "All" : TYPE_CONFIG[t].label + "s"}
                  </Button>
                )
              )}
            </div>
          </div>

          {/* Results count */}
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Loading resources..."
              : `${filtered.length} result${filtered.length !== 1 ? "s" : ""}${search || typeFilter !== "all" ? " found" : " total"}`}
          </p>

          {/* Results table */}
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Loading resources from all instances...
            </p>
          ) : filtered.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              {search || typeFilter !== "all"
                ? "No matching resources found"
                : "No resources found across any instance"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Instance
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Detail
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Provider
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr
                      key={`${r.serverId}-${r.type}-${r.name}-${i}`}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3 font-medium">{r.name}</td>
                      <td className="px-4 py-3">
                        <TypeBadge type={r.type} />
                      </td>
                      <td className="px-4 py-3">
                        <ServerBadge name={r.serverName} />
                      </td>
                      <td className="px-4 py-3">
                        {r.detail && (
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded max-w-[300px] truncate block">
                            {r.detail}
                          </code>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {r.provider ?? "unknown"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`${TYPE_CONFIG[r.type].page}?search=${encodeURIComponent(r.name)}`}
                          onClick={() => handleJump(r)}
                          className="text-xs text-primary hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
