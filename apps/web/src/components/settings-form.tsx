"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateWorkspace } from "@/lib/api-client";
import { changeEmail, updateUser } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Status = { kind: "ok" | "error"; message: string } | null;

interface SettingsFormProps {
  user: { name: string; email: string; image: string | null };
  company: { name: string };
  /** Whether the viewer may edit company details (admin). */
  canEditCompany: boolean;
}

/** Account settings: profile, email, and (for admins) company details. */
export function SettingsForm({ user, company, canEditCompany }: SettingsFormProps) {
  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile, sign-in email, and organization.
        </p>
      </div>
      <ProfileCard name={user.name} image={user.image} />
      <EmailCard email={user.email} />
      <CompanyCard name={company.name} canEdit={canEditCompany} />
    </div>
  );
}

function StatusLine({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <p
      className={`text-xs ${status.kind === "ok" ? "text-muted-foreground" : "text-destructive"}`}
    >
      {status.message}
    </p>
  );
}

function ProfileCard({ name, image }: { name: string; image: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const nextName = String(data.get("name") ?? "").trim();
    const nextImage = String(data.get("image") ?? "").trim();
    if (!nextName) {
      setStatus({ kind: "error", message: "Name is required." });
      return;
    }
    startTransition(async () => {
      setStatus(null);
      // Send the empty string (not undefined) so clearing the field removes the picture.
      const { error } = await updateUser({ name: nextName, image: nextImage });
      if (error) {
        setStatus({ kind: "error", message: error.message ?? "Couldn't save your profile." });
        return;
      }
      setStatus({ kind: "ok", message: "Profile saved." });
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your name and picture across SpecBoard.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar name={name} image={image} />
            <label className="flex-1 space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Profile picture URL
              </span>
              <Input
                name="image"
                type="url"
                defaultValue={image ?? ""}
                placeholder="https://…"
              />
            </label>
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Name</span>
            <Input name="name" defaultValue={name} autoComplete="name" required />
          </label>
          <StatusLine status={status} />
          <Button type="submit" disabled={pending}>
            {pending ? "…" : "Save profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Avatar({ name, image }: { name: string; image: string | null }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={image}
        alt=""
        className="h-12 w-12 shrink-0 rounded-full object-cover"
      />
    );
  }
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
      {initial}
    </div>
  );
}

function EmailCard({ email }: { email: string }) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const newEmail = String(new FormData(form).get("email") ?? "").trim();
    if (!newEmail || newEmail === email) {
      setStatus({ kind: "error", message: "Enter a different email address." });
      return;
    }
    startTransition(async () => {
      setStatus(null);
      const { error } = await changeEmail({ newEmail, callbackURL: "/settings" });
      if (error) {
        setStatus({ kind: "error", message: error.message ?? "Couldn't change your email." });
        return;
      }
      form.reset();
      setStatus({
        kind: "ok",
        message: `Check ${email} for a link to confirm the change.`,
      });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email</CardTitle>
        <CardDescription>
          You sign in with <span className="text-foreground">{email}</span>. Changing it sends a
          confirmation link to your current address.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">New email</span>
            <Input name="email" type="email" autoComplete="email" required />
          </label>
          <StatusLine status={status} />
          <Button type="submit" disabled={pending}>
            {pending ? "…" : "Change email"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CompanyCard({ name, canEdit }: { name: string; canEdit: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nextName = String(new FormData(e.currentTarget).get("name") ?? "").trim();
    if (!nextName) {
      setStatus({ kind: "error", message: "Company name is required." });
      return;
    }
    startTransition(async () => {
      setStatus(null);
      try {
        await updateWorkspace(nextName);
        setStatus({ kind: "ok", message: "Company saved." });
        router.refresh();
      } catch (err) {
        setStatus({
          kind: "error",
          message: err instanceof Error ? err.message : "Couldn't save company details.",
        });
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company</CardTitle>
        <CardDescription>
          {canEdit
            ? "Your organization's name across SpecBoard."
            : "Your organization. Only an admin can change these details."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Company name</span>
            <Input name="name" defaultValue={name} disabled={!canEdit} required />
          </label>
          {canEdit ? (
            <>
              <StatusLine status={status} />
              <Button type="submit" disabled={pending}>
                {pending ? "…" : "Save company"}
              </Button>
            </>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
