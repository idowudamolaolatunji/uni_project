"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiMenu, FiBookOpen } from "react-icons/fi";
import type { IconType } from "react-icons";
import { ProfileMenu } from "@/components/profile-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon: IconType;
}

function NavLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-secondary font-medium text-secondary-foreground"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            )}
          >
            {active && (
              <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary" />
            )}
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  homeHref,
  navItems,
  children,
}: {
  homeHref: string;
  navItems: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex flex-1">
      <aside className="hidden w-56 shrink-0 flex-col border-r bg-sidebar p-4 sm:flex">
        <Link
          href={homeHref}
          className="mb-6 flex items-center gap-2 px-3 text-sm font-semibold"
        >
          <FiBookOpen className="size-4 text-primary" />
          Resource Recommender
        </Link>
        <NavLinks items={navItems} pathname={pathname} />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="sm:hidden">
                <FiMenu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <SheetHeader>
                <SheetTitle asChild>
                  <Link
                    href={homeHref}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 text-sm font-semibold"
                  >
                    <FiBookOpen className="size-4 text-primary" />
                    Resource Recommender
                  </Link>
                </SheetTitle>
              </SheetHeader>
              <div className="px-4">
                <NavLinks
                  items={navItems}
                  pathname={pathname}
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>

          <Link
            href={homeHref}
            className="flex items-center gap-2 text-sm font-semibold sm:hidden"
          >
            <FiBookOpen className="size-4 text-primary" />
            Resource Recommender
          </Link>

          <div className="flex-1" />
          <ProfileMenu />
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
