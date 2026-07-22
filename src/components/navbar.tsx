"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { FiLogOut } from "react-icons/fi";
import { Button } from "@/components/ui/button";

const STUDENT_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/search", label: "Search" },
];

const ADMIN_LINKS = [
  { href: "/admin", label: "Catalog" },
  { href: "/admin/upload", label: "Upload" },
];

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const links = session
    ? session.user.role === "admin"
      ? ADMIN_LINKS
      : STUDENT_LINKS
    : [];

  const homeHref = session
    ? session.user.role === "admin"
      ? "/admin"
      : "/dashboard"
    : "/";

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <Link href={homeHref} className="font-semibold">
          Resource Recommender
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                pathname === link.href
                  ? "font-medium text-foreground"
                  : "text-muted-foreground transition-colors hover:text-foreground"
              }
            >
              {link.label}
            </Link>
          ))}

          {status === "authenticated" && (
            <div className="flex items-center gap-3 pl-2">
              <span className="hidden text-muted-foreground sm:inline">
                {session.user.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <FiLogOut className="size-4" />
                Log out
              </Button>
            </div>
          )}

          {status === "unauthenticated" && (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Register</Link>
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
