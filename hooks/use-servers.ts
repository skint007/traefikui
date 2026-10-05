"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAPI, resourceRetryOptions } from "@/lib/client-request";

interface Server {
  id: string;
  name: string;
  url: string;
  apiKeyMasked: string;
  isDefault: boolean;
  status: "online" | "offline" | "unknown";
  lastSeen: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useServers() {
  return useQuery<Server[]>({
    ...resourceRetryOptions,
    queryKey: ["servers"],
    queryFn: ({ signal }) => fetchAPI("/api/servers", { signal }),
  });
}

export function useServer(id: string | null) {
  return useQuery<Server>({
    ...resourceRetryOptions,
    queryKey: ["servers", id],
    queryFn: ({ signal }) => fetchAPI(`/api/servers/${id}`, { signal }),
    enabled: !!id,
  });
}

export function useCreateServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; url: string; apiKey: string; isDefault?: boolean }) => {
      return fetchAPI<Server>("/api/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servers"] });
    },
  });
}

export function useUpdateServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      url?: string;
      apiKey?: string;
      isDefault?: boolean;
    }) => {
      return fetchAPI<Server>(`/api/servers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servers"] });
    },
  });
}

export function useDeleteServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return fetchAPI(`/api/servers/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servers"] });
    },
  });
}

export function useServerHealth(id: string | null) {
  return useQuery<{ ok: boolean; version?: string; error?: string }>({
    ...resourceRetryOptions,
    queryKey: ["servers", id, "health"],
    queryFn: ({ signal }) => fetchAPI(`/api/servers/${id}/health`, { signal }),
    enabled: !!id,
    refetchInterval: 30000,
  });
}

export function useLocalInstanceName() {
  return useQuery<string>({
    ...resourceRetryOptions,
    queryKey: ["local-instance-name"],
    queryFn: async ({ signal }) => {
      const data = await fetchAPI<{ name: string }>("/api/settings/local-name", { signal });
      return data.name;
    },
  });
}

export function useUpdateLocalInstanceName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const data = await fetchAPI<{ name: string }>("/api/settings/local-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      return data.name;
    },
    onSuccess: (name) => {
      queryClient.setQueryData(["local-instance-name"], name);
    },
  });
}
