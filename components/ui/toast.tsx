"use client";

import { CheckCircle, Info, WarningCircle } from "@phosphor-icons/react";
import { Toast } from "@base-ui/react/toast";

import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

type AppToastData = {
  variant?: ToastVariant;
};

type ToastInput = {
  title: string;
  description?: string;
  id?: string;
};

export const toastManager = Toast.createToastManager<AppToastData>();

export const toast = {
  success({ title, description, id }: ToastInput) {
    return toastManager.add({
      id,
      title,
      description,
      type: "success",
      data: { variant: "success" },
      priority: "low",
    });
  },
  error({ title, description, id }: ToastInput) {
    return toastManager.add({
      id,
      title,
      description,
      type: "error",
      data: { variant: "error" },
      priority: "high",
    });
  },
  info({ title, description, id }: ToastInput) {
    return toastManager.add({
      id,
      title,
      description,
      type: "info",
      data: { variant: "info" },
      priority: "low",
    });
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider limit={3} timeout={2500} toastManager={toastManager}>
      {children}
      <Toaster />
    </Toast.Provider>
  );
}

function Toaster() {
  const { toasts } = Toast.useToastManager<AppToastData>();

  return (
    <Toast.Portal>
      <Toast.Viewport className="fixed top-3 right-3 left-3 z-50 sm:top-5 sm:right-5 sm:left-5 lg:top-8 lg:right-8 lg:left-auto lg:w-[24rem]">
        {toasts.map((item) => (
          <Toast.Root
            className={cn(
              "[--gap:0.75rem] [--peek:0.625rem] [--scale:calc(max(0,1-(var(--toast-index)*0.05)))] [--shrink:calc(1-var(--scale))] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))]",
              "absolute top-0 right-0 left-auto z-[calc(1000-var(--toast-index))] w-full origin-top overflow-hidden rounded-2xl border shadow-[0_24px_80px_rgba(9,9,11,0.18)] ring-1 ring-white/40 backdrop-blur-xl select-none",
              toastSurfaceClass(item.data?.variant ?? "info"),
              "[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc((var(--toast-swipe-movement-y)+(var(--toast-index)*var(--peek))+(var(--shrink)*var(--height)))))_scale(var(--scale))]",
              "after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
              "h-[var(--height)] transition-[height,opacity,transform] duration-300 ease-out data-expanded:h-[var(--toast-height)] data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--offset-y)*-1))] data-limited:opacity-0 data-starting-style:opacity-0 data-starting-style:[transform:translateY(-18px)_scale(0.98)] data-ending-style:opacity-0 data-ending-style:[transform:translateY(-16px)_scale(0.98)]"
            )}
            key={item.id}
            swipeDirection={["right", "down"]}
            toast={item}
          >
            <Toast.Content className="flex items-start gap-3 p-4 transition-opacity duration-200 data-behind:opacity-0 data-expanded:opacity-100">
              <ToastIcon variant={item.data?.variant ?? "info"} />
              <div className="min-w-0 flex-1">
                <Toast.Title className="text-sm font-semibold leading-5">
                  {item.title}
                </Toast.Title>
                {item.description && (
                  <Toast.Description className="mt-1 text-sm leading-5 opacity-85">
                    {item.description}
                  </Toast.Description>
                )}
              </div>
            </Toast.Content>
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}

function ToastIcon({ variant }: { variant: ToastVariant }) {
  const className = "mt-0.5 size-5 shrink-0";

  if (variant === "success") {
    return <CheckCircle aria-hidden="true" className={className} weight="fill" />;
  }

  if (variant === "error") {
    return <WarningCircle aria-hidden="true" className={className} weight="fill" />;
  }

  return <Info aria-hidden="true" className={className} weight="fill" />;
}

function toastSurfaceClass(variant: ToastVariant) {
  if (variant === "success") {
    return "border-emerald-500 bg-emerald-600 text-white";
  }

  if (variant === "error") {
    return "border-red-500 bg-red-600 text-white";
  }

  return "border-zinc-950/10 bg-white text-zinc-950";
}
