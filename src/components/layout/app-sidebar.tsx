"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Settings, Users, Plus, Hash, PanelLeftClose, PanelLeft,
  CheckSquare, FolderKanban, BookOpen, Sparkles, Zap, BarChart3, Activity, ChevronLeft,
  Network, ShieldCheck, SlidersHorizontal, Eye, ScrollText,
} from "lucide-react";
import { useUiStore } from "@/stores/ui-store";
import { useAccess } from "@/hooks/use-access";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { OrgSwitcher } from "./org-switcher";
import type { Workspace } from "@/types";
import type { ModuleKey } from "@/lib/rbac";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; feature?: string; module?: ModuleKey; exact?: boolean };

export function AppSidebar({
  orgId,
  orgSlug,
  workspaces,
}: {
  orgId: string;
  orgSlug: string;
  workspaces: Workspace[];
}) {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, mobileNavOpen, setMobileNav } = useUiStore();
  const access = useAccess(orgId);

  // Permission/visibility gate. While access is loading, show everything so nav
  // never flickers empty; once loaded, hide items the role can't see.
  const visible = (item: NavItem) => {
    if (!access.ready) return true;
    if (item.feature && !access.isVisible(item.feature)) return false;
    if (item.module && !access.can(item.module, "view")) return false;
    return true;
  };

  const nav: NavItem[] = [
    { href: `/${orgSlug}/dashboard`, label: "Dashboard", icon: LayoutDashboard, feature: "nav.dashboard", module: "dashboard" },
    { href: `/${orgSlug}/activity`, label: "Activity", icon: Activity, feature: "nav.activity" },
    { href: `/${orgSlug}/reports`, label: "Reports", icon: BarChart3, feature: "nav.reports", module: "reports" },
    { href: `/${orgSlug}/members`, label: "Members", icon: Users, feature: "nav.members", module: "members" },
    { href: `/${orgSlug}/organization`, label: "Org structure", icon: Network, feature: "nav.organization", module: "members" },
    { href: `/${orgSlug}/roles`, label: "Roles & access", icon: ShieldCheck, feature: "nav.roles", module: "roles" },
    { href: `/${orgSlug}/settings/general`, label: "Settings", icon: Settings, feature: "nav.settings", module: "settings" },
  ];

  const adminNav: NavItem[] = [
    { href: `/${orgSlug}/permissions`, label: "Permission matrix", icon: SlidersHorizontal, module: "permissions" },
    { href: `/${orgSlug}/visibility`, label: "Feature visibility", icon: Eye, module: "permissions" },
    { href: `/${orgSlug}/dashboard-config`, label: "Dashboard config", icon: LayoutDashboard, module: "permissions" },
    { href: `/${orgSlug}/audit`, label: "Audit log", icon: ScrollText, module: "permissions" },
  ];

  const wsMatch = pathname.match(new RegExp(`^/${orgSlug}/w/([^/]+)`));
  const activeWsId = wsMatch?.[1];
  const targetWsId = activeWsId ?? workspaces[0]?.id;
  const targetWs = workspaces.find((w) => w.id === targetWsId);
  const moduleNav: NavItem[] = targetWsId
    ? [
        { href: `/${orgSlug}/w/${targetWsId}`, label: "Overview", icon: LayoutDashboard, exact: true },
        { href: `/${orgSlug}/w/${targetWsId}/tasks`, label: "Tasks", icon: CheckSquare, feature: "nav.tasks", module: "tasks" },
        { href: `/${orgSlug}/w/${targetWsId}/projects`, label: "Projects", icon: FolderKanban, feature: "nav.projects", module: "projects" },
        { href: `/${orgSlug}/w/${targetWsId}/knowledge`, label: "Knowledge", icon: BookOpen, feature: "nav.knowledge", module: "knowledge" },
        { href: `/${orgSlug}/w/${targetWsId}/capture`, label: "AI Capture", icon: Sparkles, feature: "nav.capture", module: "tasks" },
        { href: `/${orgSlug}/w/${targetWsId}/automations`, label: "Automations", icon: Zap, feature: "nav.automations", module: "automation" },
      ]
    : [];

  const renderLink = (item: NavItem) => {
    const active = item.exact ? pathname === item.href : pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href as never}
        onClick={() => setMobileNav(false)}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          sidebarCollapsed && "md:justify-center md:px-0",
        )}
      >
        <item.icon className="size-4 shrink-0" />
        <span className={cn(sidebarCollapsed && "md:hidden")}>{item.label}</span>
      </Link>
    );
  };

  const visibleNav = nav.filter(visible);
  const visibleAdmin = adminNav.filter(visible);
  const visibleModule = moduleNav.filter((i) => i.exact || visible(i));

  return (
    <>
      {/* Mobile scrim — tap to close the drawer. */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setMobileNav(false)} aria-hidden />
      )}
      <aside
        className={cn(
          "flex h-screen shrink-0 flex-col border-r bg-card transition-all",
          sidebarCollapsed ? "w-64 md:w-[64px]" : "w-64",
          // Off-canvas drawer on small screens; static sidebar on md+.
          "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:shadow-xl max-md:transition-transform",
          mobileNavOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full",
        )}
      >
      <div className="flex h-14 items-center gap-1 border-b px-2">
        {!sidebarCollapsed && (
          <div className="min-w-0 flex-1">
            <OrgSwitcher currentSlug={orgSlug} />
          </div>
        )}
        <Button variant="ghost" size="icon" className="size-9 shrink-0" onClick={toggleSidebar}>
          {sidebarCollapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {visibleNav.map(renderLink)}

        {visibleModule.length > 0 && (
          <>
            {!sidebarCollapsed && (
              <div className="truncate px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {targetWs?.name ?? "Workspace"}
              </div>
            )}
            {visibleModule.map(renderLink)}
            {!sidebarCollapsed && activeWsId && (
              <Link
                href={`/${orgSlug}/dashboard`}
                className="flex items-center gap-3 rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronLeft className="size-3.5" /> Back to org
              </Link>
            )}
          </>
        )}

        {visibleAdmin.length > 0 && (
          <>
            {!sidebarCollapsed && (
              <div className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Administration
              </div>
            )}
            {visibleAdmin.map(renderLink)}
          </>
        )}

        {!sidebarCollapsed && (
          <div className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Workspaces
          </div>
        )}
        {workspaces.map((w) => {
          const href = `/${orgSlug}/w/${w.id}`;
          const active = pathname === href;
          return (
            <Link
              key={w.id}
              href={href as never}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                sidebarCollapsed && "justify-center px-0",
              )}
              title={w.name}
            >
              <span className="grid size-4 shrink-0 place-items-center text-xs">
                {w.icon ?? <Hash className="size-4" />}
              </span>
              {!sidebarCollapsed && <span className="truncate">{w.name}</span>}
            </Link>
          );
        })}

        {!sidebarCollapsed && (
          <Link
            href={`/${orgSlug}/workspaces/new`}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Plus className="size-4 shrink-0" /> New workspace
          </Link>
        )}
      </nav>
      </aside>
    </>
  );
}
