"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { signOut, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

/**
 * Header account control. Renders nothing while the session is loading or when
 * auth is disabled (local file mode — the session endpoint returns 501, which
 * surfaces as an error here), so self-host stays visually unchanged.
 */
export function AccountControl() {
  const { data, isPending, error } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  if (isPending || error) return null;

  if (!data?.user) {
    const from = encodeURIComponent(pathname);
    return (
      <Link
        href={`/sign-in?from=${from}`}
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Sign in
      </Link>
    );
  }

  function onSignOut() {
    startTransition(async () => {
      await signOut();
      router.push("/sign-in");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/settings"
        className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
      >
        {data.user.email}
      </Link>
      <Button size="sm" variant="ghost" onClick={onSignOut} disabled={pending}>
        Sign out
      </Button>
    </div>
  );
}
