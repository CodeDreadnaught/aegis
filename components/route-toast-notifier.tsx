"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { toast } from "@/components/ui/toast";

const routeToasts = {
  "login-success": {
    title: "Signed in",
    description: "Welcome back to AEGIS.",
  },
  "equipment-created": {
    title: "Equipment registered",
    description: "The asset profile is ready for monitoring.",
  },
  "equipment-bulk-created": {
    title: "Equipment registered",
    description: "The equipment records are ready for telemetry and maintenance workflows.",
  },
  "equipment-updated": {
    title: "Equipment updated",
    description: "The asset profile changes were saved.",
  },
} as const;

type RouteToastKey = keyof typeof routeToasts;

export function RouteToastNotifier() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toastKey = searchParams.get("toast");

  useEffect(() => {
    if (!toastKey || !(toastKey in routeToasts)) {
      return;
    }

    const routeToast = routeToasts[toastKey as RouteToastKey];
    toast.success({
      id: `route-${toastKey}`,
      title: routeToast.title,
      description: routeToast.description,
    });

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("toast");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }, [pathname, router, searchParams, toastKey]);

  return null;
}
