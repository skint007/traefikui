"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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

async function fetchAPI<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API error: ${res.status}`);
  }
  return res.json();
}

export function useServers() {
  return useQuery<Server[]>({
    queryKey: ["servers"],
    queryFn: () => fetchAPI("/api/servers"),
  });
}

export function useServer(id: string | null) {
  return useQuery<Server>({
    queryKey: ["servers", id],
    queryFn: () => fetchAPI(`/api/servers/${id}`),
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
    queryKey: ["servers", id, "health"],
    queryFn: () => fetchAPI(`/api/servers/${id}/health`),
    enabled: !!id,
    refetchInterval: 30000,
  });
}

export function useLocalInstanceName() {
  return useQuery<string>({
    queryKey: ["local-instance-name"],
    queryFn: async () => {
      const data = await fetchAPI<{ name: string }>("/api/settings/local-name");
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
