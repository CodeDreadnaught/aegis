"use client";

import { useState } from "react";
import { List } from "@phosphor-icons/react";

import { NavigationLinks } from "@/components/app-shell/navigation-links";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function MobileNavigation() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button size="icon" variant="outline" />}>
        <List aria-hidden="true" className="size-5" />
        <span className="sr-only">Open navigation</span>
      </SheetTrigger>
      <SheetContent className="bg-sidebar text-sidebar-foreground" side="left">
        <SheetHeader className="border-b border-sidebar-border">
          <SheetTitle>AEGIS</SheetTitle>
          <SheetDescription className="text-sidebar-foreground/65">
            Intelligent Predictive Maintenance
          </SheetDescription>
        </SheetHeader>
        <div className="px-3">
          <NavigationLinks onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
