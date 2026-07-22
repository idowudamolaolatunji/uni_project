"use client";

import { FiGrid, FiUpload } from "react-icons/fi";
import { AppShell } from "@/components/app-shell";
import { AdminGuard } from "@/components/admin-guard";

const NAV_ITEMS = [
  { href: "/admin", label: "Catalog", icon: FiGrid },
  { href: "/admin/upload", label: "Upload", icon: FiUpload },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <AppShell homeHref="/admin" navItems={NAV_ITEMS}>
        {children}
      </AppShell>
    </AdminGuard>
  );
}
