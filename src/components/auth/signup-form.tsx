"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";
import { signUp } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { GoogleButton } from "./google-button";

export function SignupForm() {
  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });
  const [pending, setPending] = React.useState(false);
  const [sent, setSent] = React.useState<string | null>(null);
  const [redirectTo, setRedirectTo] = React.useState<string | null>(null);
  React.useEffect(() => {
    setRedirectTo(new URLSearchParams(window.location.search).get("redirect"));
  }, []);

  async function onSubmit(values: SignupInput) {
    setPending(true);
    const res = await signUp(values, redirectTo ?? undefined);
    setPending(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    if (res?.message) setSent(res.message);
  }

  const loginHref = redirectTo
    ? `/login?redirect=${encodeURIComponent(redirectTo)}`
    : "/login";

  if (sent) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
        <p className="text-sm text-muted-foreground">{sent}</p>
        <Link href={loginHref as never} className="text-sm font-medium text-foreground hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">Start turning activity into action.</p>
      </div>

      <GoogleButton />
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input autoComplete="name" placeholder="Ada Lovelace" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" placeholder="you@company.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={loginHref as never} className="font-medium text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
