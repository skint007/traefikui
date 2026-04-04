"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/store/ui-store";

async function fetchAPI<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API error: ${res.status}`);
  }
  return res.json();
}

function serverParam(serverId: string | null): string {
  return serverId ? `serverId=${encodeURIComponent(serverId)}` : "";
}

export function useConfigFiles() {
  const activeServerId = useUIStore((s) => s.activeServerId);
  return useQuery<string[]>({
    queryKey: ["config", "files", activeServerId],
    queryFn: () => {
      const sp = serverParam(activeServerId);
      return fetchAPI(`/api/config/list${sp ? `?${sp}` : ""}`);
    },
  });
}

export function useConfigFile(filePath: string | null) {
  const activeServerId = useUIStore((s) => s.activeServerId);
  return useQuery<{ content: string; parsed: unknown }>({
    queryKey: ["config", "file", filePath, activeServerId],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("path", filePath!);
      if (activeServerId) params.set("serverId", activeServerId);
      return fetchAPI(`/api/config/read?${params.toString()}`);
    },
    enabled: !!filePath,
  });
}

export function useDeleteConfig() {
  const queryClient = useQueryClient();
  const activeServerId = useUIStore((s) => s.activeServerId);

  return useMutation({
    mutationFn: async ({ filePath }: { filePath: string }) => {
      return fetchAPI("/api/config/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, serverId: activeServerId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] });
      queryClient.invalidateQueries({ queryKey: ["traefik"] });
    },
  });
}

export function useRenameConfig() {
  const queryClient = useQueryClient();
  const activeServerId = useUIStore((s) => s.activeServerId);

  return useMutation({
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] });
      queryClient.invalidateQueries({ queryKey: ["traefik"] });
    },
  });
}

export function useWriteConfig() {
  const queryClient = useQueryClient();
  const activeServerId = useUIStore((s) => s.activeServerId);

  return useMutation({
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] });
      queryClient.invalidateQueries({ queryKey: ["traefik"] });
    },
  });
}
