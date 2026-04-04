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

export function useTemplateFiles() {
  return useQuery<string[]>({
    queryKey: ["templates", "files"],
    queryFn: () => fetchAPI("/api/templates/list"),
  });
}

export function useTemplateFile(filePath: string | null) {
  return useQuery<{ content: string }>({
    queryKey: ["templates", "file", filePath],
    queryFn: () =>
      fetchAPI(`/api/templates/read?path=${encodeURIComponent(filePath!)}`),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] });
    },
  });
}
