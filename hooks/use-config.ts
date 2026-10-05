"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/store/ui-store";
import { fetchAPI, resourceRetryOptions } from "@/lib/client-request";
import { invalidateServerConfig } from "@/hooks/config-invalidation";

function serverParam(serverId: string | null): string {
  return serverId ? `serverId=${encodeURIComponent(serverId)}` : "";
}

export function useConfigFiles() {
  const activeServerId = useUIStore((s) => s.activeServerId);
  return useQuery<string[]>({
    ...resourceRetryOptions,
    queryKey: ["config", "files", activeServerId],
    queryFn: ({ signal }) => {
      const sp = serverParam(activeServerId);
      return fetchAPI(`/api/config/list${sp ? `?${sp}` : ""}`, { signal });
    },
  });
}

export function useConfigFile(filePath: string | null) {
  const activeServerId = useUIStore((s) => s.activeServerId);
  return useQuery<{ content: string; parsed: unknown }>({
    ...resourceRetryOptions,
    queryKey: ["config", "file", filePath, activeServerId],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams();
      params.set("path", filePath!);
      if (activeServerId) params.set("serverId", activeServerId);
      return fetchAPI(`/api/config/read?${params.toString()}`, { signal });
    },
    enabled: !!filePath,
  });
}

export function useDeleteConfig() {
  const queryClient = useQueryClient();
  const activeServerId = useUIStore((s) => s.activeServerId);

  return useMutation({
    mutationKey: ["config", "delete", activeServerId],
    mutationFn: async ({ filePath }: { filePath: string }) => {
      return fetchAPI("/api/config/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, serverId: activeServerId }),
      });
    },
    onMutate: () => ({ serverId: activeServerId }),
    onSuccess: (_data, _variables, context) =>
      invalidateServerConfig(queryClient, context?.serverId ?? null),
  });
}

export function useRenameConfig() {
  const queryClient = useQueryClient();
  const activeServerId = useUIStore((s) => s.activeServerId);

  return useMutation({
    mutationKey: ["config", "rename", activeServerId],
    mutationFn: async ({
      oldPath,
      newPath,
    }: {
      oldPath: string;
      newPath: string;
    }) => {
      return fetchAPI("/api/config/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPath, newPath, serverId: activeServerId }),
      });
    },
    onMutate: () => ({ serverId: activeServerId }),
    onSuccess: (_data, _variables, context) =>
      invalidateServerConfig(queryClient, context?.serverId ?? null),
  });
}

export function useWriteConfig() {
  const queryClient = useQueryClient();
  const activeServerId = useUIStore((s) => s.activeServerId);

  return useMutation({
    mutationKey: ["config", "write", activeServerId],
    mutationFn: async ({
      filePath,
      content,
    }: {
      filePath: string;
      content: string;
    }) => {
      return fetchAPI("/api/config/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, content, serverId: activeServerId }),
      });
    },
    onMutate: () => ({ serverId: activeServerId }),
    onSuccess: (_data, _variables, context) =>
      invalidateServerConfig(queryClient, context?.serverId ?? null),
  });
}
