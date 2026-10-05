"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/store/ui-store";
import { invalidateServerConfig } from "@/hooks/config-invalidation";
import { fetchAPI, resourceRetryOptions } from "@/lib/client-request";

export function useTemplateFiles() {
  return useQuery<string[]>({
    ...resourceRetryOptions,
    queryKey: ["templates", "files"],
    queryFn: ({ signal }) => fetchAPI("/api/templates/list", { signal }),
  });
}

export function useTemplateFile(filePath: string | null) {
  return useQuery<{ content: string }>({
    ...resourceRetryOptions,
    queryKey: ["templates", "file", filePath],
    queryFn: ({ signal }) =>
      fetchAPI(`/api/templates/read?path=${encodeURIComponent(filePath!)}`, { signal }),
    enabled: !!filePath,
  });
}

export function useWriteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      filePath,
      content,
    }: {
      filePath: string;
      content: string;
    }) => {
      return fetchAPI("/api/templates/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, content }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useRenameTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      oldPath,
      newPath,
    }: {
      oldPath: string;
      newPath: string;
    }) => {
      return fetchAPI("/api/templates/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPath, newPath }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ filePath }: { filePath: string }) => {
      return fetchAPI("/api/templates/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useDuplicateConfig() {
  const queryClient = useQueryClient();
  const activeServerId = useUIStore((s) => s.activeServerId);

  return useMutation({
    mutationKey: ["config", "duplicate", activeServerId],
    mutationFn: async ({
      sourcePath,
      destPath,
    }: {
      sourcePath: string;
      destPath: string;
    }) => {
      return fetchAPI("/api/config/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourcePath, destPath, serverId: activeServerId }),
      });
    },
    onMutate: () => ({ serverId: activeServerId }),
    onSuccess: (_data, _variables, context) =>
      invalidateServerConfig(queryClient, context?.serverId ?? null),
  });
}
