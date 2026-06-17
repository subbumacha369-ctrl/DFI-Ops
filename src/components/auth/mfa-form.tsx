"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "loading" | "enroll" | "challenge" | "none";

export function MfaForm() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [mode, setMode] = React.useState<Mode>("loading");
  const [factorId, setFactorId] = React.useState<string | null>(null);
  const [qr, setQr] = React.useState<string | null>(null);
  const [secret, setSecret] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const init = React.useCallback(async () => {
    const { data: factors, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      toast.error("Could not load security settings");
      setMode("none");
      return;
    }
    const verified = factors.totp.find((f) => f.status === "verified");
    if (verified) {
      setFactorId(verified.id);
      setMode("challenge");
      return;
    }
    const { data, error: enrollErr } = await supabase.auth.mfa.enroll({
      factorType: "totp",
    });
    if (enrollErr || !data) {
      toast.error("Could not start MFA enrollment");
      setMode("none");
      return;
    }
    setFactorId(data.id);
    setQr(data.totp.qr_code);
    setSecret(data.totp.secret);
    setMode("enroll");
  }, [supabase]);

  React.useEffect(() => {
    void init();
  }, [init]);

  async function verify() {
    if (!factorId || !/^\d{6}$/.test(code)) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setPending(true);
    const { data: challenge, error: challengeErr } =
      await supabase.auth.mfa.challenge({ factorId });
    if (challengeErr || !challenge) {
      setPending(false);
      return toast.error("Could not create challenge");
    }
    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });
    setPending(false);
    if (verifyErr) return toast.error("Invalid code, try again");
    toast.success("Verified");
    router.replace("/");
  }

  if (mode === "loading") {
    return <p className="text-sm text-muted-foreground">Loading security settings…</p>;
  }
  if (mode === "none") {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Two-factor unavailable</h1>
        <p className="text-sm text-muted-foreground">Continue without two-factor for now.</p>
        <Button className="w-full" onClick={() => router.replace("/")}>Continue</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "enroll" ? "Set up two-factor" : "Two-factor verification"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {mode === "enroll"
            ? "Scan the code with an authenticator app, then enter the 6-digit code."
            : "Enter the 6-digit code from your authenticator app."}
        </p>
      </div>

      {mode === "enroll" && qr && (
        <div className="space-y-3 rounded-lg border p-4">
          {/* Supabase returns the QR as an SVG data URI. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="MFA QR code" className="mx-auto h-44 w-44" />
          {secret && (
            <p className="break-all text-center font-mono text-xs text-muted-foreground">
              {secret}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="mfa-code">Authentication code</Label>
        <Input
          id="mfa-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        />
      </div>

      <Button className="w-full" onClick={verify} disabled={pending}>
        {pending ? "Verifying…" : "Verify"}
      </Button>
    </div>
  );
}
