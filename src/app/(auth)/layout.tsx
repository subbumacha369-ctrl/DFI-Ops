import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel — the one bold surface; quiet everywhere else. */}
      <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Operations OS
        </Link>
        <div className="space-y-3">
          <p className="text-2xl font-medium leading-snug">
            Every meeting, note, and message becomes work — automatically.
          </p>
          <p className="text-sm text-primary-foreground/70">
            Capture → Extract → Confirm → Track
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} Operations OS
        </p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
