"use client";

import { useState } from "react";
import { List } from "@phosphor-icons/react";

import { BrandLogo } from "@/components/brand-logo";
import { NavigationLinks } from "@/components/app-shell/navigation-links";
import type { UserRole } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type MobileNavigationProps = {
  role: UserRole;
};

export function MobileNavigation({ role }: MobileNavigationProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button size="icon" variant="outline" />}>
        <List aria-hidden="true" className="size-5" />
        <span className="sr-only">Open navigation</span>
      </SheetTrigger>
      <SheetContent className="border-zinc-200 bg-white text-zinc-950" side="left">
        <SheetHeader className="border-b border-zinc-200">
          <div className="flex items-center gap-3">
            <BrandLogo className="size-10 rounded-lg bg-transparent shadow-none" />
            <SheetTitle>AEGIS</SheetTitle>
          </div>
          <SheetDescription className="text-zinc-500">
            Intelligent Surveillance
          </SheetDescription>
        </SheetHeader>
        <div className="px-3">
          <NavigationLinks onNavigate={() => setOpen(false)} role={role} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
