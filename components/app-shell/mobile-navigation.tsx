"use client";

import { useState } from "react";
import { List, Power } from "@phosphor-icons/react";

import { BrandLogo } from "@/components/brand-logo";
import { NavigationLinks } from "@/components/app-shell/navigation-links";
import type { UserRole } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions";
import {
  Sheet,
  SheetContent,
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
      <SheetTrigger
        render={
          <Button
            className="size-10 rounded-full border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50 hover:text-zinc-950 aria-expanded:bg-emerald-50 aria-expanded:text-emerald-700"
            size="icon"
            variant="outline"
          />
        }
      >
        <List aria-hidden="true" className="size-5" />
        <span className="sr-only">Open navigation</span>
      </SheetTrigger>
      <SheetContent
        className="w-[88vw] max-w-[22rem] gap-0 border-zinc-200 bg-[#f3f3f1] p-3 text-zinc-950 shadow-[24px_0_70px_rgba(24,24,27,0.12)] sm:max-w-sm"
        showCloseButton={false}
        side="left"
      >
        <SheetHeader className="rounded-[1.35rem] border border-zinc-200 bg-white p-3 shadow-[0_16px_60px_rgba(24,24,27,0.06)]">
          <div className="flex items-center gap-3 pr-10">
            <BrandLogo className="size-10 rounded-full bg-transparent shadow-none" />
            <div className="min-w-0">
              <SheetTitle className="text-sm font-bold text-emerald-600">
                AEGIS
              </SheetTitle>
            </div>
          </div>
        </SheetHeader>
        <div className="mt-3 grid gap-3 rounded-[1.35rem] border border-zinc-200 bg-white p-2 shadow-[0_16px_60px_rgba(24,24,27,0.06)]">
          <NavigationLinks
            mobile
            onNavigate={() => setOpen(false)}
            role={role}
          />
        </div>
        <form action={logoutAction} className="mt-auto pt-3">
          <Button
            className="h-12 w-full justify-start rounded-full border border-zinc-200 bg-white px-2.5 pr-4 text-zinc-600 shadow-[0_16px_60px_rgba(24,24,27,0.06)] hover:bg-zinc-950 hover:text-white"
            type="submit"
            variant="ghost"
          >
            <span className="grid size-9 place-items-center rounded-full bg-zinc-50 text-zinc-500 group-hover/button:bg-white/10 group-hover/button:text-white">
              <Power aria-hidden="true" className="size-4" weight="bold" />
            </span>
            Logout
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
