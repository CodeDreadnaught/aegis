"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";

import { getActionErrorMessage } from "@/lib/action-error";
import { isNextRedirectError } from "@/lib/next-action-errors";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ConfirmActionFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
  confirmLabel?: string;
  description: string;
  errorTitle: string;
  title: string;
};

export function ConfirmActionForm({
  action,
  children,
  confirmLabel = "Confirm",
  description,
  errorTitle,
  title,
}: ConfirmActionFormProps) {
  const formDataRef = useRef<FormData | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    formDataRef.current = new FormData(event.currentTarget);
    setOpen(true);
  }

  function handleConfirm() {
    const formData = formDataRef.current;

    if (!formData) {
      return;
    }

    startTransition(async () => {
      try {
        await action(formData);
        formDataRef.current = null;
        setOpen(false);
      } catch (error) {
        if (isNextRedirectError(error)) {
          throw error;
        }

        toast.error({
          title: errorTitle,
          description: getActionErrorMessage(error),
        });
      }
    });
  }

  return (
    <>
      <form
        aria-busy={pending}
        data-pending={pending ? "" : undefined}
        onSubmit={handleSubmit}
      >
        <fieldset className="contents" disabled={pending}>
          {children}
        </fieldset>
      </form>
      <Dialog modal="trap-focus" onOpenChange={setOpen} open={open}>
        <DialogContent
          className="w-[min(calc(100vw-2rem),28rem)] max-w-none gap-0 rounded-lg border-zinc-200 bg-white p-0 shadow-2xl"
          showCloseButton={false}
        >
          <div className="border-b border-zinc-100 px-5 py-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-zinc-950">
                {title}
              </DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter className="border-t border-zinc-100 px-5 py-4">
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              className="bg-red-600 px-5 text-white hover:bg-red-700"
              disabled={pending}
              onClick={handleConfirm}
              type="button"
            >
              {confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
