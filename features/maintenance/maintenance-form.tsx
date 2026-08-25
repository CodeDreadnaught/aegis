"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import {
  Plus,
  SpinnerGap,
  Trash,
  UploadSimple,
  Wrench,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  formatMaintenanceStatus,
  maintenanceStatuses,
} from "@/features/maintenance/validation";
import { getActionErrorMessage } from "@/lib/action-error";
import { toast } from "@/components/ui/toast";

type MaintenanceFormProps = {
  action: (formData: FormData) => Promise<{ count: number } | void>;
  equipment: Array<{
    id: string;
    assetTag: string;
    name: string;
  }>;
};

type ManualRow = {
  id: string;
};

export function MaintenanceForm({ action, equipment }: MaintenanceFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [entryMode, setEntryMode] = useState<"manual" | "sheet">("manual");
  const [manualRows, setManualRows] = useState<ManualRow[]>([
    { id: "maintenance-row-1" },
  ]);
  const [importPromptOpen, setImportPromptOpen] = useState(false);
  const [selectedImportFileName, setSelectedImportFileName] = useState("");
  const [pending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);
  const isSheetMode = entryMode === "sheet";

  useEffect(() => {
    if (!importPromptOpen) {
      return;
    }

    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousHtmlScrollbarGutter = html.style.scrollbarGutter;
    const previousBodyOverflow = body.style.overflow;

    html.style.overflow = "hidden";
    html.style.scrollbarGutter = "auto";
    body.style.overflow = "hidden";

    return () => {
      html.style.overflow = previousHtmlOverflow;
      html.style.scrollbarGutter = previousHtmlScrollbarGutter;
      body.style.overflow = previousBodyOverflow;
    };
  }, [importPromptOpen]);

  function addManualRow() {
    setManualRows((rows) => [
      ...rows,
      { id: `maintenance-row-${Date.now()}-${rows.length}` },
    ]);
  }

  function removeManualRow(rowId: string) {
    setManualRows((rows) =>
      rows.length === 1 ? rows : rows.filter((row) => row.id !== rowId)
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    startTransition(async () => {
      try {
        const result = await action(new FormData(form));
        formRef.current?.reset();
        setEntryMode("manual");
        setManualRows([{ id: "maintenance-row-1" }]);
        setImportPromptOpen(false);
        setSelectedImportFileName("");
        toast.success({
          title: isSheetMode ? "Maintenance imported" : "Maintenance saved",
          description:
            result?.count && result.count > 1
              ? `${result.count} maintenance records were saved.`
              : "The maintenance record was saved.",
        });
      } catch (error) {
        toast.error({
          title: "Maintenance was not saved",
          description: getActionErrorMessage(error),
        });
      }
    });
  }

  return (
    <Card
      className="min-w-0 rounded-lg border-zinc-200 bg-white shadow-sm"
      data-motion="panel"
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Wrench className="size-5 text-zinc-500" />
          Record maintenance
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <form className="grid gap-4" onSubmit={handleSubmit} ref={formRef}>
          <div className="grid gap-2">
            <Label htmlFor="entryMode">Entry method</Label>
            <select
              className="h-11 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-700 shadow-xs outline-none transition-colors focus:border-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={pending}
              id="entryMode"
              name="entryMode"
              onChange={(event) => {
                const nextMode = event.currentTarget.value as
                  | "manual"
                  | "sheet";
                setEntryMode(nextMode);
                setImportPromptOpen(false);
                setSelectedImportFileName("");
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              value={entryMode}
            >
              <option value="manual">Manual entry</option>
              <option value="sheet">Maintenance import</option>
            </select>
          </div>

          {isSheetMode ? (
            <MaintenanceImportField
              fileInputRef={fileInputRef}
              importPromptOpen={importPromptOpen}
              pending={pending}
              selectedImportFileName={selectedImportFileName}
              setImportPromptOpen={setImportPromptOpen}
              setSelectedImportFileName={setSelectedImportFileName}
            />
          ) : (
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-zinc-500">
                  {manualRows.length === 1
                    ? "Manual entry"
                    : `${manualRows.length} maintenance entries`}
                </p>
                <button
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-700 underline-offset-4 transition-colors hover:text-zinc-950 hover:underline"
                  disabled={pending}
                  onClick={addManualRow}
                  type="button"
                >
                  <Plus aria-hidden="true" className="size-4" />
                  Add another
                </button>
              </div>

              {manualRows.map((row, index) => (
                <div
                  className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
                  key={row.id}
                >
                  {manualRows.length > 1 ? (
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-zinc-950">
                        Record {index + 1}
                      </p>
                      <Button
                        className="rounded-full text-red-600 hover:text-red-700"
                        disabled={pending}
                        onClick={() => removeManualRow(row.id)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        <Trash />
                        Remove
                      </Button>
                    </div>
                  ) : null}
                  <MaintenanceFields
                    equipment={equipment}
                    index={index}
                    pending={pending}
                    rowId={row.id}
                    today={today}
                  />
                </div>
              ))}
            </div>
          )}

          <Button
            className="h-11 w-full rounded-full bg-zinc-950 text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!equipment.length || pending}
            type="submit"
          >
            {pending ? <SpinnerGap className="animate-spin" /> : <Wrench />}
            {pending
              ? isSheetMode
                ? "Importing"
                : "Saving"
              : isSheetMode
                ? "Import maintenance"
                : "Save maintenance"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function MaintenanceImportField({
  fileInputRef,
  importPromptOpen,
  pending,
  selectedImportFileName,
  setImportPromptOpen,
  setSelectedImportFileName,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  importPromptOpen: boolean;
  pending: boolean;
  selectedImportFileName: string;
  setImportPromptOpen: (open: boolean) => void;
  setSelectedImportFileName: (fileName: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="maintenanceImportFile">Maintenance import sheet</Label>
      <button
        className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-center transition-colors hover:border-zinc-950 hover:bg-white focus-visible:border-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/15 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        onClick={() => setImportPromptOpen(true)}
        type="button"
      >
        <UploadSimple className="size-6 text-zinc-500" />
        <span className="text-sm font-semibold text-zinc-950">
          Upload CSV maintenance records
        </span>
        <span className="text-xs text-zinc-500">
          Attach a CSV file with maintenance records for one or more equipment.
        </span>
        {selectedImportFileName ? (
          <span className="max-w-full truncate rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700">
            {selectedImportFileName}
          </span>
        ) : null}
      </button>
      <Input
        accept=".csv,text/csv"
        className="sr-only"
        id="maintenanceImportFile"
        name="maintenanceImportFile"
        onChange={(event) =>
          setSelectedImportFileName(event.currentTarget.files?.[0]?.name ?? "")
        }
        ref={fileInputRef}
        required
        type="file"
      />
      <Dialog
        modal="trap-focus"
        onOpenChange={setImportPromptOpen}
        open={importPromptOpen}
      >
        <DialogContent
          className="w-[min(calc(100vw-2rem),30rem)] max-w-none gap-0 rounded-lg border-zinc-200 bg-white p-0 shadow-2xl"
          showCloseButton={false}
        >
          <div className="border-b border-zinc-100 px-5 py-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-zinc-950">
                Maintenance import sheet
              </DialogTitle>
              <DialogDescription>
                Upload a CSV file containing one maintenance record per row.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="grid gap-3 px-5 py-4">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-sm font-semibold text-zinc-950">
                Required maintenance data
              </p>
              <p className="mt-2 text-sm leading-5 text-zinc-600">
                Each row should identify the equipment using equipmentId or
                assetTag, then include maintenance type, status, performed date,
                and work notes.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-3">
              <p className="text-sm font-semibold text-zinc-950">
                Supported file type
              </p>
              <p className="mt-2 text-sm leading-5 text-zinc-600">
                Use a comma-separated CSV file. Include next due date when the
                work creates a follow-up schedule.
              </p>
            </div>
          </div>
          <DialogFooter className="border-t border-zinc-100 px-5 py-4">
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              className="rounded-full bg-zinc-950 px-5 text-white hover:bg-zinc-800"
              onClick={() => {
                setImportPromptOpen(false);
                window.requestAnimationFrame(() => {
                  fileInputRef.current?.click();
                });
              }}
              type="button"
            >
              <UploadSimple />
              Upload CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MaintenanceFields({
  equipment,
  index,
  pending,
  rowId,
  today,
}: {
  equipment: Array<{
    id: string;
    assetTag: string;
    name: string;
  }>;
  index: number;
  pending: boolean;
  rowId: string;
  today: string;
}) {
  const suffix = `${rowId}-${index}`;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="grid gap-2 md:col-span-2">
        <Label htmlFor={`equipmentId-${suffix}`}>Equipment</Label>
        <select
          className="h-11 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-700 shadow-xs outline-none transition-colors focus:border-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending || !equipment.length}
          id={`equipmentId-${suffix}`}
          name="equipmentId"
          required
        >
          {!equipment.length ? <option value="">No equipment available</option> : null}
          {equipment.map((item) => (
            <option key={item.id} value={item.id}>
              {item.assetTag} - {item.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`type-${suffix}`}>Type</Label>
        <select
          className="h-11 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-700 shadow-xs outline-none transition-colors focus:border-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          id={`type-${suffix}`}
          name="type"
          required
        >
          <option value="Inspection">Inspection</option>
          <option value="Preventive maintenance">Preventive maintenance</option>
          <option value="Corrective repair">Corrective repair</option>
          <option value="Lubrication">Lubrication</option>
          <option value="Calibration">Calibration</option>
          <option value="Replacement">Replacement</option>
          <option value="Safety check">Safety check</option>
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`status-${suffix}`}>Status</Label>
        <select
          className="h-11 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-700 shadow-xs outline-none transition-colors focus:border-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
          defaultValue="COMPLETED"
          disabled={pending}
          id={`status-${suffix}`}
          name="status"
        >
          {maintenanceStatuses.map((status) => (
            <option key={status} value={status}>
              {formatMaintenanceStatus(status)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`performedAt-${suffix}`}>Performed</Label>
        <Input
          className="h-11 rounded-full border-zinc-200 bg-zinc-50 px-4"
          defaultValue={today}
          disabled={pending}
          id={`performedAt-${suffix}`}
          name="performedAt"
          required
          type="date"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`nextDueDate-${suffix}`}>Next due</Label>
        <Input
          className="h-11 rounded-full border-zinc-200 bg-zinc-50 px-4"
          disabled={pending}
          id={`nextDueDate-${suffix}`}
          name="nextDueDate"
          type="date"
        />
      </div>

      <div className="grid gap-2 md:col-span-2">
        <Label htmlFor={`description-${suffix}`}>Notes</Label>
        <Textarea
          className="min-h-24 rounded-lg border-zinc-200 bg-zinc-50 px-4 py-3"
          disabled={pending}
          id={`description-${suffix}`}
          name="description"
          placeholder="Work notes and follow-up actions"
          required
        />
      </div>
    </div>
  );
}
