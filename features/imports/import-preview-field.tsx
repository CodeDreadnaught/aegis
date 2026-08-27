"use client";

import { useMemo, useRef, useState } from "react";
import { DownloadSimple, FileCsv, WarningCircle, XCircle } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildTemplateCsv,
  importDefinitions,
  type ImportKind,
} from "@/features/imports/definitions";
import {
  buildImportPreview,
  parseImportFile,
  type ImportColumnMapping,
  type ImportPreview,
  type ParsedImportSheet,
} from "@/features/imports/parser";
import {
  validateEquipmentImportRow,
  validateMaintenanceImportRow,
  validateOperationalReadingImportRow,
} from "@/features/imports/preview-validation";

type ImportPreviewFieldProps = {
  disabled?: boolean;
  kind: ImportKind;
  required?: boolean;
};

const validators = {
  equipment: validateEquipmentImportRow,
  maintenance: validateMaintenanceImportRow,
  operationalReadings: validateOperationalReadingImportRow,
} satisfies Record<ImportKind, (row: Record<string, string>) => string[]>;

export function ImportPreviewField({
  disabled = false,
  kind,
  required = true,
}: ImportPreviewFieldProps) {
  const definition = importDefinitions[kind];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [sheet, setSheet] = useState<ParsedImportSheet | null>(null);
  const [manualMapping, setManualMapping] = useState<ImportColumnMapping>({});
  const [fileError, setFileError] = useState("");
  const templateHref = useMemo(
    () =>
      `data:text/csv;charset=utf-8,${encodeURIComponent(
        buildTemplateCsv(definition)
      )}`,
    [definition]
  );
  const preview: ImportPreview | null = sheet
    ? buildImportPreview(
        definition,
        sheet,
        manualMapping,
        (row) => validators[kind](row)
      )
    : null;
  const canSubmit =
    Boolean(selectedFileName) &&
    Boolean(preview) &&
    !preview?.missingRequired.length &&
    !preview?.rowErrors.length;

  async function handleFileChange(file: File | undefined) {
    setSelectedFileName(file?.name ?? "");
    setSheet(null);
    setManualMapping({});
    setFileError("");

    if (!file) {
      return;
    }

    try {
      setSheet(await parseImportFile(file));
      setOpen(true);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Unable to read file.");
      setOpen(true);
    }
  }

  function updateMapping(canonical: string, header: string) {
    setManualMapping((current) => {
      const next = { ...current };

      if (header) {
        next[canonical] = header;
      } else {
        delete next[canonical];
      }

      return next;
    });
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={definition.fileInputName}>{definition.title} file</Label>
        <a
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 underline-offset-4 hover:text-zinc-950 hover:underline"
          download={definition.templateFileName}
          href={templateHref}
        >
          <DownloadSimple aria-hidden="true" className="size-4" />
          Template
        </a>
      </div>

      <button
        className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-center transition-colors hover:border-zinc-950 hover:bg-white focus-visible:border-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/15 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        onClick={() => {
          if (selectedFileName) {
            setOpen(true);
            return;
          }
          fileInputRef.current?.click();
        }}
        type="button"
      >
        <FileCsv className="size-6 text-zinc-500" />
        <span className="text-sm font-semibold text-zinc-950">
          Upload CSV or Excel file
        </span>
        <span className="text-xs text-zinc-500">{definition.description}</span>
        {selectedFileName ? (
          <span className="max-w-full truncate rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700">
            {selectedFileName}
          </span>
        ) : null}
      </button>

      <Input
        accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="sr-only"
        id={definition.fileInputName}
        name={definition.fileInputName}
        onChange={(event) => handleFileChange(event.currentTarget.files?.[0])}
        ref={fileInputRef}
        required={required}
        type="file"
      />
      <input
        name={`${definition.fileInputName}Mappings`}
        type="hidden"
        value={JSON.stringify(manualMapping)}
      />

      <Dialog modal="trap-focus" onOpenChange={setOpen} open={open}>
        <DialogContent
          className="grid h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] !w-[calc(100vw-1rem)] !max-w-[calc(100vw-1rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-lg border-zinc-200 bg-white p-0 shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:!w-[min(calc(100vw-2rem),88rem)] sm:!max-w-[min(calc(100vw-2rem),88rem)]"
          showCloseButton={false}
        >
          <div className="border-b border-zinc-100 px-4 py-3 sm:px-5 sm:py-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-zinc-950">
                Review {definition.title.toLowerCase()}
              </DialogTitle>
              <DialogDescription>
                Confirm recognized columns before AEGIS saves the spreadsheet.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid min-h-0 min-w-0 touch-pan-y gap-4 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4 [-webkit-overflow-scrolling:touch] sm:px-5">
            {fileError ? (
              <StatusPanel
                icon={<XCircle className="size-5" />}
                tone="error"
                title={fileError}
              />
            ) : null}

            {preview ? (
              <>
                <div className="grid min-w-0 gap-3 md:grid-cols-3">
                  <Metric label="Rows" value={preview.rowCount.toLocaleString()} />
                  <Metric
                    label="Recognized"
                    value={preview.matches.length.toLocaleString()}
                  />
                  <Metric
                    label="Issues"
                    value={(
                      preview.missingRequired.length + preview.rowErrors.length
                    ).toLocaleString()}
                  />
                </div>

                {preview.missingRequired.length ? (
                  <StatusPanel
                    icon={<WarningCircle className="size-5" />}
                    tone="warning"
                    title="Missing required columns"
                  >
                    <p className="mt-1 text-sm text-zinc-600">
                      Map these fields before importing:{" "}
                      {preview.missingRequired
                        .map((canonical) => fieldLabel(definition, canonical))
                        .join(", ")}
                    </p>
                  </StatusPanel>
                ) : null}

                <div className="min-w-0 overflow-hidden rounded-lg border border-zinc-200">
                  <div className="hidden gap-3 border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500 lg:grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)]">
                    <span>System field</span>
                    <span>Spreadsheet column</span>
                    <span>Suggestion</span>
                  </div>
                  <div className="divide-y divide-zinc-100">
                    {definition.fields.map((field) => {
                      const match = preview.matches.find(
                        (item) => item.canonical === field.canonical
                      );
                      const suggestion = preview.suggestions.find(
                        (item) => item.canonical === field.canonical
                      );

                      return (
                        <div
                          className="grid min-w-0 gap-3 px-4 py-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] lg:items-center"
                          key={field.canonical}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-zinc-950">
                              {field.label}
                            </p>
                            <p className="text-xs font-medium text-zinc-500">
                              {field.required ? "Required" : "Optional"}
                            </p>
                          </div>
                          <select
                            aria-label={`Spreadsheet column for ${field.label}`}
                            className="h-10 w-full min-w-0 rounded-full border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 outline-none focus:border-zinc-950"
                            onChange={(event) =>
                              updateMapping(field.canonical, event.currentTarget.value)
                            }
                            value={manualMapping[field.canonical] ?? match?.header ?? ""}
                          >
                            <option value="">Not mapped</option>
                            {preview.headers.map((header) => (
                              <option key={header} value={header}>
                                {header}
                              </option>
                            ))}
                          </select>
                          <p className="min-w-0 break-words text-sm font-medium text-zinc-500">
                            {match
                              ? `${match.kind === "manual" ? "Manual" : "Exact"}: ${
                                  match.header
                                }`
                              : suggestion
                                ? `Suggested: ${suggestion.header}`
                                : "None"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {preview.mappedRowsPreview.length ? (
                  <div className="min-w-0 overflow-hidden rounded-lg border border-zinc-200">
                    <div className="flex flex-col gap-1 border-b border-zinc-100 bg-zinc-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-zinc-950">
                          Data preview
                        </p>
                        <p className="text-xs font-medium text-zinc-500">
                          Showing the first {preview.mappedRowsPreview.length} mapped
                          rows.
                        </p>
                      </div>
                    </div>
                    <div className="max-w-full overflow-x-auto">
                      <table className="w-full min-w-[58rem] text-left text-sm">
                        <thead className="bg-zinc-50 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                          <tr>
                            {definition.fields.slice(0, 8).map((field) => (
                              <th className="px-4 py-3" key={field.canonical}>
                                {field.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {preview.mappedRowsPreview.map((row, index) => (
                            <tr key={`preview-row-${index}`}>
                              {definition.fields.slice(0, 8).map((field) => (
                                <td
                                  className="max-w-44 truncate px-4 py-3 font-medium text-zinc-700"
                                  key={field.canonical}
                                >
                                  {row[field.canonical] || "-"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}

                {preview.rowErrors.length ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <div className="flex items-start gap-3">
                      <WarningCircle className="mt-0.5 size-5 shrink-0 text-red-700" />
                      <div>
                        <p className="text-sm font-semibold text-red-700">
                          Some rows need correction before import
                        </p>
                        <p className="mt-1 text-sm text-red-700/80">
                          Fix the rows below, or leave optional initial-reading
                          columns blank when you only want to register equipment.
                        </p>
                      </div>
                    </div>
                    <ul className="mt-3 grid gap-2 text-sm text-red-700">
                      {preview.rowErrors.slice(0, 8).map((error) => (
                        <li
                          className="rounded-md border border-red-200 bg-white/70 px-3 py-2"
                          key={`${error.rowNumber}-${error.message}`}
                        >
                          <span className="font-semibold">Row {error.rowNumber}</span>
                          <span className="text-red-700/80"> - {error.message}</span>
                        </li>
                      ))}
                    </ul>
                    {preview.rowErrors.length > 8 ? (
                      <p className="mt-2 text-sm font-medium text-red-700">
                        {preview.rowErrors.length - 8} more errors hidden.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

          <div className="grid gap-2 border-t border-zinc-100 px-4 py-3 sm:flex sm:justify-end sm:px-5 sm:py-4">
            <Button
              className="w-full rounded-full sm:w-auto"
              onClick={() => setOpen(false)}
              type="button"
              variant="outline"
            >
              Close
            </Button>
            <Button
              className="w-full rounded-full border-zinc-200 bg-white px-5 text-zinc-950 hover:bg-zinc-50 sm:w-auto"
              onClick={() => fileInputRef.current?.click()}
              type="button"
              variant="outline"
            >
              Choose another file
            </Button>
            <Button
              className="w-full rounded-full bg-zinc-950 px-5 text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              disabled={!canSubmit}
              onClick={() => setOpen(false)}
              type="button"
            >
              Use this file
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-zinc-950">{value}</p>
    </div>
  );
}

function StatusPanel({
  children,
  icon,
  title,
  tone,
}: {
  children?: React.ReactNode;
  icon: React.ReactNode;
  title: string;
  tone: "error" | "success" | "warning";
}) {
  const className =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <div className={`rounded-lg border p-4 ${className}`}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function fieldLabel(
  definition: (typeof importDefinitions)[ImportKind],
  canonical: string
) {
  return (
    definition.fields.find((field) => field.canonical === canonical)?.label ??
    canonical
  );
}
