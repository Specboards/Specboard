"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { signIn, signUp } from "@/lib/auth-client";
import { safeRedirectPath } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Mode = "sign-in" | "sign-up";

const copy: Record<
  Mode,
  { title: string; description: string; submit: string; altText: string; altHref: string; altLabel: string }
> = {
  "sign-in": {
    title: "Sign in",
    description: "Welcome back to SpecBoard.",
    submit: "Sign in",
    altText: "Need an account?",
    altHref: "/sign-up",
    altLabel: "Sign up",
  },
  "sign-up": {
    title: "Create your account",
    description: "Sign up with your work email to get started.",
    submit: "Sign up",
    altText: "Already have an account?",
    altHref: "/sign-in",
    altLabel: "Sign in",
  },
};

/** Email/password sign-in and sign-up form backed by the Better Auth client. */
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const t = copy[mode];

  // After auth, return to wherever the user was headed (set by the redirect
  // that bounced them here), defaulting to the backlog. Sanitized so a crafted
  // `?from=` can't turn the sign-in link into an open redirect.
  const redirectTo = safeRedirectPath(searchParams.get("from"));

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const name = String(data.get("name") ?? "").trim();

    startTransition(async () => {
      setError(null);
      const { error } =
        mode === "sign-up"
          ? await signUp.email({ email, password, name })
          : await signIn.email({ email, password });

      if (error) {
        setError(error.message ?? "Something went wrong. Please try again.");
        return;
      }
      router.push(redirectTo);
      router.refresh();
    });
  }

  return (
    <Card className="mx-auto mt-16 w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "sign-up" ? (
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Name</span>
              <Input name="name" autoComplete="name" required />
            </label>
          ) : null}
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Email</span>
            <Input name="email" type="email" autoComplete="email" required />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Password</span>
            <Input
              name="password"
              type="password"
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              required
            />
          </label>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "…" : t.submit}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {t.altText}{" "}
          <Link href={t.altHref} className="text-foreground underline-offset-4 hover:underline">
            {t.altLabel}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
