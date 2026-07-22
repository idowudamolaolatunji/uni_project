"use client";

import { FiHome, FiSearch } from "react-icons/fi";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: FiHome },
  { href: "/search", label: "Search", icon: FiSearch },
];

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <AppShell homeHref="/dashboard" navItems={NAV_ITEMS}>
        {children}
      </AppShell>
    </RequireAuth>
  );
}
