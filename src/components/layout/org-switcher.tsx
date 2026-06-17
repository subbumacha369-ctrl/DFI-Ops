"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useOrganizations } from "@/hooks/use-organizations";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function OrgSwitcher({ currentSlug }: { currentSlug: string }) {
  const router = useRouter();
  const { data: orgs } = useOrganizations();
  const current = orgs?.find((o) => o.slug === currentSlug);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 w-full justify-between px-2 font-medium">
          <span className="truncate">{current?.name ?? "Select organization"}</span>
          <ChevronsUpDown className="size-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        {orgs?.map((o) => (
          <DropdownMenuItem key={o.id} onClick={() => router.push(`/${o.slug}/dashboard`)}>
            <Check className={cn("size-4", o.slug === currentSlug ? "opacity-100" : "opacity-0")} />
            <span className="truncate">{o.name}</span>
            <span className="ml-auto text-xs capitalize text-muted-foreground">{o.role}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/create-organization")}>
          <Plus className="size-4" /> New organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
