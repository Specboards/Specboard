import type { ReactNode } from "react";
import Link from "next/link";

import { MainNav } from "@/components/main-nav";

import "./globals.css";

export const metadata = {
  title: "SpecBoard",
  description: "Spec-based product management over git-native specs.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex h-12 max-w-6xl items-center gap-8 px-4">
            <Link
              href="/backlog"
              className="text-sm font-semibold tracking-tight"
            >
              SpecBoard
            </Link>
            <MainNav />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
