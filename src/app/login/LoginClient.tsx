"use client";

import { useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Grid3x3 } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { cn } from "@/lib/utils";

type Props = {
  showIdleExpired?: boolean;
};

export function LoginClient({ showIdleExpired }: Props) {
  const router = useRouter();
  const { settings } = useSystemSettings();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const defaultCompanyName = "GabyGod Technologies";
  const displayName = settings?.companyName?.trim() || defaultCompanyName;
  const logoUrl = settings?.logoUrl ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.12] via-background to-cyan-500/[0.12] dark:from-primary/[0.18] dark:via-background dark:to-blue-900/30"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-1/4 top-0 h-[min(100vw,32rem)] w-[min(100vw,32rem)] rounded-full bg-primary/20 blur-3xl animate-pulse [animation-duration:5s]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-1/4 -right-1/4 h-[min(90vw,28rem)] w-[min(90vw,28rem)] rounded-full bg-cyan-500/15 blur-3xl dark:bg-cyan-400/10 animate-pulse [animation-delay:1.5s] [animation-duration:6s]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-400/10 blur-2xl dark:bg-amber-500/5 motion-safe:animate-[login-float_8s_ease-in-out_infinite]"
        aria-hidden
      />

      <Card
        className={cn(
          "relative z-10 w-full max-w-md border-border/60 bg-card/90 shadow-2xl shadow-primary/5 backdrop-blur-md",
          "animate-in fade-in zoom-in-95 slide-in-from-bottom-3 duration-700"
        )}
      >
        <CardHeader className="space-y-5 pb-2 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/10 to-cyan-500/10 p-0.5 shadow-inner motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
            {logoUrl ? (
              <div className="relative h-full w-full overflow-hidden rounded-[0.9rem] bg-card">
                <Image
                  src={logoUrl}
                  alt={displayName}
                  width={64}
                  height={64}
                  className="h-full w-full object-contain p-1.5"
                  priority
                />
              </div>
            ) : (
              <Grid3x3 className="h-8 w-8 text-primary" aria-hidden />
            )}
          </div>

          <div className="space-y-1.5 px-1">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-500">
              Welcome to
            </p>
            <h1
              className={cn(
                "text-balance break-words text-base font-semibold leading-tight tracking-tight sm:text-xl",
                "bg-gradient-to-r from-primary via-orange-500 to-amber-600 bg-clip-text text-transparent",
                "dark:from-primary dark:via-amber-400 dark:to-amber-200",
                "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-both motion-safe:duration-700 motion-safe:delay-100"
              )}
            >
              {displayName}
            </h1>
          </div>
          <CardDescription className="pt-0 text-balance">
            Enter your credentials to access the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showIdleExpired && (
            <div
              role="status"
              className="mb-4 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm"
            >
              <p className="font-medium text-foreground">
                You were signed out for inactivity
              </p>
              <p className="mt-1 text-muted-foreground leading-relaxed">
                Your session closed automatically after 2 hours with no
                activity. Sign in again to continue working.
              </p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
