"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { connectRepository, type SyncResult } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export interface ConnectedRepo {
  id: string;
  owner: string;
  name: string;
  defaultBranch: string;
  githubInstallationId: string;
}

interface RepositoriesManagerProps {
  repos: ConnectedRepo[];
  /** Whether the viewer (admin) may connect/re-sync repositories. */
  canConnect: boolean;
  /** GitHub App "install" URL, when NEXT_PUBLIC_GITHUB_APP_SLUG is configured. */
  installUrl: string | null;
}

function syncMessage(sync: SyncResult | { error: string }): {
  kind: "ok" | "error";
  message: string;
} {
  if ("error" in sync) return { kind: "error", message: sync.error };
  const parts = [`${sync.upserted} imported`, `${sync.skipped} unchanged`];
  if (sync.idsInjected > 0) parts.push(`${sync.idsInjected} stable id(s) assigned`);
  return { kind: "ok", message: parts.join(" · ") };
}

export function RepositoriesManager({ repos, canConnect, installUrl }: RepositoriesManagerProps) {
  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Repositories</h1>
        <p className="text-sm text-muted-foreground">
          SpecBoard imports <code>specs/**/spec.md</code> from connected repositories and keeps the
          board in sync on every push.
        </p>
      </div>

      <RepoList repos={repos} canConnect={canConnect} />

      {canConnect ? (
        <ConnectForm installUrl={installUrl} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Only an admin can connect repositories.
        </p>
      )}
    </div>
  );
}

function RepoList({ repos, canConnect }: { repos: ConnectedRepo[]; canConnect: boolean }) {
  if (repos.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          No repositories connected yet.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {repos.map((repo) => (
        <RepoRow key={repo.id} repo={repo} canResync={canConnect} />
      ))}
    </div>
  );
}

function RepoRow({ repo, canResync }: { repo: ConnectedRepo; canResync: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ kind: "ok" | "error"; message: string } | null>(null);

  function resync() {
    startTransition(async () => {
      setStatus(null);
      try {
        const { sync } = await connectRepository({
          installationId: repo.githubInstallationId,
          owner: repo.owner,
          name: repo.name,
          defaultBranch: repo.defaultBranch,
        });
        setStatus(syncMessage(sync));
        router.refresh();
      } catch (err) {
        setStatus({
          kind: "error",
          message: err instanceof Error ? err.message : "Re-sync failed.",
        });
      }
    });
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 py-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {repo.owner}/{repo.name}
          </p>
          <p className="text-xs text-muted-foreground">
            Branch <code>{repo.defaultBranch}</code>
            {status ? (
              <>
                {" · "}
                <span className={status.kind === "error" ? "text-destructive" : ""}>
                  {status.message}
                </span>
              </>
            ) : null}
          </p>
        </div>
        {canResync ? (
          <Button size="sm" variant="outline" onClick={resync} disabled={pending}>
            {pending ? "…" : "Re-sync"}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ConnectForm({ installUrl }: { installUrl: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ kind: "ok" | "error"; message: string } | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const installationId = String(data.get("installationId") ?? "").trim();
    const owner = String(data.get("owner") ?? "").trim();
    const name = String(data.get("name") ?? "").trim();
    const defaultBranch = String(data.get("defaultBranch") ?? "").trim();

    if (!installationId || !owner || !name) {
      setStatus({ kind: "error", message: "Installation ID, owner, and name are required." });
      return;
    }

    startTransition(async () => {
      setStatus(null);
      try {
        const { sync } = await connectRepository({
          installationId,
          owner,
          name,
          defaultBranch: defaultBranch || undefined,
        });
        const msg = syncMessage(sync);
        // A connect always persists the repo; only the import may have failed.
        setStatus(
          msg.kind === "ok"
            ? { kind: "ok", message: `Connected. ${msg.message}.` }
            : { kind: "error", message: `Connected, but import failed: ${msg.message}` },
        );
        form.reset();
        router.refresh();
      } catch (err) {
        setStatus({
          kind: "error",
          message: err instanceof Error ? err.message : "Couldn't connect the repository.",
        });
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect a repository</CardTitle>
        <CardDescription>
          {installUrl ? (
            <>
              First{" "}
              <a
                href={installUrl}
                target="_blank"
                rel="noreferrer"
                className="text-foreground underline-offset-4 hover:underline"
              >
                install the SpecBoard GitHub App
              </a>{" "}
              on your repository, then paste the installation ID from the install URL below.
            </>
          ) : (
            "Install the SpecBoard GitHub App on your repository, then enter its installation ID (from the install URL) along with the owner and name."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Owner</span>
              <Input name="owner" placeholder="StudioPalouse" required />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Repository</span>
              <Input name="name" placeholder="SpecBoard" required />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Installation ID</span>
              <Input name="installationId" placeholder="12345678" required />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Default branch
              </span>
              <Input name="defaultBranch" placeholder="main" />
            </label>
          </div>
          {status ? (
            <p
              className={`text-xs ${status.kind === "ok" ? "text-muted-foreground" : "text-destructive"}`}
            >
              {status.message}
            </p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "…" : "Connect repository"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
