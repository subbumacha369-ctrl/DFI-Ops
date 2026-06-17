import { create } from "zustand";

type OrgState = {
  currentOrgId: string | null;
  currentOrgSlug: string | null;
  currentWorkspaceId: string | null;
  setOrg: (id: string, slug: string) => void;
  setWorkspace: (id: string | null) => void;
};

/** In-memory pointer to the active org/workspace for the current session. */
export const useOrgStore = create<OrgState>((set) => ({
  currentOrgId: null,
  currentOrgSlug: null,
  currentWorkspaceId: null,
  setOrg: (id, slug) => set({ currentOrgId: id, currentOrgSlug: slug }),
  setWorkspace: (id) => set({ currentWorkspaceId: id }),
}));
