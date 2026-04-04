"use client";

import { useServers, useLocalInstanceName } from "@/hooks/use-servers";
import { useUIStore } from "@/store/ui-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Server } from "lucide-react";
import { cn } from "@/lib/utils";

export function ServerSelector() {
  const { data: servers } = useServers();
  const { data: localName } = useLocalInstanceName();
  const activeServerId = useUIStore((s) => s.activeServerId);
  const setActiveServerId = useUIStore((s) => s.setActiveServerId);

  // Don't show selector if no remote servers are configured
  if (!servers?.length) return null;

  return (
    <div className="px-4 pt-4 pb-2">
      <Select
        value={activeServerId ?? "local"}
        onValueChange={(v) => setActiveServerId(v === "local" ? null : v)}
      >
        <SelectTrigger className="w-full">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="local">
            <div className="flex items-center gap-2">
              <StatusDot status="online" />
              {localName ?? "Local Instance"}
            </div>
          </SelectItem>
          {servers.map((srv) => (
            <SelectItem key={srv.id} value={srv.id}>
              <div className="flex items-center gap-2">
                <StatusDot status={srv.status} />
                {srv.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        status === "online" && "bg-green-500",
        status === "offline" && "bg-red-500",
        status === "unknown" && "bg-yellow-500"
      )}
    />
  );
}
