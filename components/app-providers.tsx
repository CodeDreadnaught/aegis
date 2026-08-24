"use client";

import { Suspense } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/components/ui/toast";
import { RouteToastNotifier } from "@/components/route-toast-notifier";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ToastProvider>
      <TooltipProvider>
        {children}
        <Suspense fallback={null}>
          <RouteToastNotifier />
        </Suspense>
      </TooltipProvider>
    </ToastProvider>
  );
}
