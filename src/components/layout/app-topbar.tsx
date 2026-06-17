"use client";

import * as React from "react";
import { Menu } from "lucide-react";
import { useUiStore } from "@/stores/ui-store";
import { UserMenu } from "./user-menu";
import { NotificationBell } from "./notification-bell";

export function AppTopbar({ title, actions }: { title: string; actions?: React.ReactNode }) {
  const setMobileNav = useUiStore((s) => s.setMobileNav);
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={() => setMobileNav(true)}
          className="grid size-9 shrink-0 place-items-center rounded-md hover:bg-muted md:hidden"
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </button>
        <h1 className="truncate text-sm font-semibold tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
