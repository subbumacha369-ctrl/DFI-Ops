"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createWorkspaceSchema, type CreateWorkspaceInput } from "@/lib/validations/workspace";
import { useCreateWorkspace } from "@/hooks/use-workspaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export function CreateWorkspaceForm({ orgId, orgSlug }: { orgId: string; orgSlug: string }) {
  const router = useRouter();
  const create = useCreateWorkspace(orgId);
  const form = useForm<CreateWorkspaceInput>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: { orgId, name: "", icon: "", description: "" },
  });

  async function onSubmit(values: CreateWorkspaceInput) {
    try {
      const res = await create.mutateAsync({
        name: values.name,
        icon: values.icon || undefined,
        description: values.description || undefined,
      });
      toast.success("Workspace created");
      router.push(`/${orgSlug}/w/${res.workspaceId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create workspace");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-md space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Workspace name</FormLabel>
              <FormControl>
                <Input placeholder="Field Operations" autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="icon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Icon (emoji, optional)</FormLabel>
              <FormControl>
                <Input placeholder="🛠️" maxLength={8} {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (optional)</FormLabel>
              <FormControl>
                <Input placeholder="What this workspace is for" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create workspace"}
        </Button>
      </form>
    </Form>
  );
}
