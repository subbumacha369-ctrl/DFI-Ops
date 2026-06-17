import { create } from "zustand";
import { persist } from "zustand/middleware";

type UiState = {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebar: (collapsed: boolean) => void;
  /** Mobile off-canvas nav drawer (not persisted). */
  mobileNavOpen: boolean;
  setMobileNav: (open: boolean) => void;
};

/** UI chrome preferences. Persisted to localStorage so layout sticks. */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebar: (collapsed) => set({ sidebarCollapsed: collapsed }),
      mobileNavOpen: false,
      setMobileNav: (open) => set({ mobileNavOpen: open }),
    }),
    { name: "ops-os-ui", partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }) },
  ),
);
