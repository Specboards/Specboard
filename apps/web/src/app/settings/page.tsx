import { eq, users } from "@specboard/db";

import { getServerSessionUser } from "@/lib/auth-session";
import { getDb } from "@/lib/db";
import { getWorkspaceById } from "@/lib/workspace";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { SettingsForm } from "@/components/settings-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings · SpecBoard" };

/**
 * Account settings. Gated like the content pages (redirects to /sign-in or
 * /setup as needed). In local file mode there's no account to manage, so it
 * shows a short notice instead.
 */
export default async function SettingsPage() {
  const access = await requireWorkspaceAccess();
  const db = getDb();
  const user = await getServerSessionUser();

  if (!access || !db || !user) {
    return (
      <section className="mx-auto mt-16 max-w-xl text-center">
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Account settings are unavailable in local file mode.
        </p>
      </section>
    );
  }

  const [profile] = await db
    .select({ image: users.image })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  const workspace = await getWorkspaceById(db, access.workspaceId);

  return (
    <SettingsForm
      user={{ name: user.name, email: user.email, image: profile?.image ?? null }}
      company={{ name: workspace?.name ?? "" }}
      canEditCompany={access.role === "admin"}
    />
  );
}
