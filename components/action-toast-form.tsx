"use client";

import { useTransition, type FormEvent } from "react";

import { getActionErrorMessage } from "@/lib/action-error";
import { toast } from "@/components/ui/toast";

type ActionToastFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
  className?: string;
  errorTitle: string;
  successDescription?: string;
  successTitle: string;
};

export function ActionToastForm({
  action,
  children,
  className,
  errorTitle,
  successDescription,
  successTitle,
}: ActionToastFormProps) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    startTransition(async () => {
      try {
        await action(new FormData(form));
        toast.success({
          title: successTitle,
          description: successDescription,
        });
      } catch (error) {
        toast.error({
          title: errorTitle,
          description: getActionErrorMessage(error),
        });
      }
    });
  }

  return (
    <form
      aria-busy={pending}
      className={className}
      data-pending={pending ? "" : undefined}
      onSubmit={handleSubmit}
    >
      <fieldset className="contents" disabled={pending}>
        {children}
      </fieldset>
    </form>
  );
}
