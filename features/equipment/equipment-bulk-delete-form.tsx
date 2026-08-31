"use client";

import { useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Trash } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { getActionErrorMessage } from "@/lib/action-error";

export function EquipmentBulkDeleteForm({
  action,
  children,
  enabled,
}: {
  action: (formData: FormData) => Promise<{ count: number }>;
  children: ReactNode;
  enabled: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [pending, startTransition] = useTransition();

  function syncSelectedCount() {
    const form = formRef.current;

    if (!form) {
      setSelectedCount(0);
      return;
    }

    setSelectedCount(
      form.querySelectorAll<HTMLInputElement>('input[name="equipmentId"]:checked')
        .length
    );
  }

  function handleSelectAll(checked: boolean) {
    const form = formRef.current;

    if (!form) {
      return;
    }

    for (const input of form.querySelectorAll<HTMLInputElement>('input[name="equipmentId"]')) {
      input.checked = checked;
    }

    syncSelectedCount();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!enabled) {
      return;
    }

    if (!selectedCount) {
      toast.error({
        title: "No equipment selected",
        description: "Select at least one equipment record before deleting.",
      });
      return;
    }

    setOpen(true);
  }

  function confirmDelete() {
    const form = formRef.current;

    if (!form) {
      return;
    }

    startTransition(async () => {
      try {
        const result = await action(new FormData(form));
        setOpen(false);
        form.reset();
        setSelectedCount(0);
        toast.success({
          title: "Equipment deleted",
          description:
            result.count === 1
              ? "1 equipment record was deleted."
              : `${result.count.toLocaleString()} equipment records were deleted.`,
        });
        router.refresh();
      } catch (error) {
        toast.error({
          title: "Equipment was not deleted",
          description: getActionErrorMessage(error),
        });
      }
    });
  }

  return (
    <>
      <form onChange={syncSelectedCount} onSubmit={handleSubmit} ref={formRef}>
        {enabled ? (
          <div className="flex flex-col gap-2 border-b border-zinc-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600">
              <input
                className="size-4 rounded border-zinc-300 text-zinc-950"
                onChange={(event) => handleSelectAll(event.currentTarget.checked)}
                type="checkbox"
              />
              Select all visible
            </label>
            <Button
              className="rounded-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={pending || selectedCount === 0}
              size="sm"
              type="submit"
              variant="outline"
            >
              <Trash />
              Delete selected{selectedCount ? ` (${selectedCount})` : ""}
            </Button>
          </div>
        ) : null}
        {children}
      </form>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete selected equipment?</DialogTitle>
            <DialogDescription>
              This will permanently delete the selected equipment and its linked readings, prediction jobs, predictions, recommendations, alerts, maintenance records, and related audit rows.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button disabled={pending} type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={pending}
              onClick={confirmDelete}
              type="button"
            >
              <Trash />
              {pending ? "Deleting" : "Delete equipment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}