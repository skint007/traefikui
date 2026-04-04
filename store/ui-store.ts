import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarOpen: boolean;
  selectedRouter: string | null;
  selectedService: string | null;
  selectedMiddleware: string | null;
  activePanel: "overview" | "routers" | "services" | "middlewares" | "certificates" | "config";
  pollingInterval: number;
  activeServerId: string | null;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSelectedRouter: (name: string | null) => void;
  setSelectedService: (name: string | null) => void;
  setSelectedMiddleware: (name: string | null) => void;
  setActivePanel: (panel: UIState["activePanel"]) => void;
  setPollingInterval: (interval: number) => void;
  setActiveServerId: (id: string | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      selectedRouter: null,
      selectedService: null,
      selectedMiddleware: null,
      activePanel: "overview",
      pollingInterval: 5000,
      activeServerId: null,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSelectedRouter: (name) => set({ selectedRouter: name }),
      setSelectedService: (name) => set({ selectedService: name }),
      setSelectedMiddleware: (name) => set({ selectedMiddleware: name }),
      setActivePanel: (panel) => set({ activePanel: panel }),
      setPollingInterval: (interval) => set({ pollingInterval: interval }),
      setActiveServerId: (id) => set({ activeServerId: id }),
    }),
    {
      name: "traefikui-store",
      partialize: (state) => ({
        activeServerId: state.activeServerId,
        pollingInterval: state.pollingInterval,
      }),
    }
  )
);
