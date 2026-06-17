"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { ROLE_ORDER, ROLE_LABEL, ALL_PERMISSIONS, PERMISSION_LABEL, can } from "@/lib/rbac";
import { Card, CardContent } from "@/components/ui/card";

export function PermissionMatrix() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        The permission set granted to each functional role. Enforced in the frontend (UI visibility),
        backend (API route guards), and database (RLS helpers).
      </p>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="sticky left-0 bg-card px-4 py-3 text-left font-medium">Permission</th>
                {ROLE_ORDER.map((r) => (
                  <th key={r} className="px-3 py-3 text-center font-medium">
                    <div className="whitespace-nowrap text-xs">{ROLE_LABEL[r]}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_PERMISSIONS.map((p) => (
                <tr key={p} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="sticky left-0 bg-card px-4 py-2.5 text-left">
                    <div className="font-medium">{PERMISSION_LABEL[p]}</div>
                    <div className="text-[11px] text-muted-foreground">{p}</div>
                  </td>
                  {ROLE_ORDER.map((r) => (
                    <td key={r} className="px-3 py-2.5 text-center">
                      {can(r, p)
                        ? <Check className="mx-auto size-4 text-primary" />
                        : <span className="text-muted-foreground">·</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
