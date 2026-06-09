import { createServerClient } from "@supabase/ssr";

/**
 * Server-side Supabase client. Supabase provides auth (and RLS-scoped DB access
 * for the SaaS multi-tenant deployment). SCAFFOLD: cookie wiring for the App
 * Router (cookies() from next/headers) is left to implement.
 */
export function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return createServerClient(url, key, {
    cookies: {
      getAll: () => [],
      setAll: () => {
        /* wire to next/headers cookies() */
      },
    },
  });
}
