"use client";

import { Eye } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function MessageViewDialog({
  message,
  meta,
  title = "Message detail",
}: {
  message: string;
  meta?: string;
  title?: string;
}) {
  const sections = formatMessageSections(message);

  return (
    <Dialog modal="trap-focus">
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Eye aria-hidden="true" className="size-4" />
        View message
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] sm:w-[42rem] max-w-none gap-0 overflow-y-auto rounded-lg border-zinc-200 bg-white p-0 shadow-2xl">
        <div className="border-b border-zinc-100 px-5 py-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-zinc-950">
              {title}
            </DialogTitle>
            {meta ? <DialogDescription>{meta}</DialogDescription> : null}
          </DialogHeader>
        </div>
        <div className="grid gap-3 px-5 py-4">
          {sections.map(section => (
            <section
              className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
              key={section.label}
            >
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                {section.label}
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-950">
                {section.value}
              </p>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatMessageSections(message: string) {
  const sections = [
    { label: "Risk", value: extractSection(message, "Risk", "Reason") },
    {
      label: "Reason",
      value: extractSection(
        message,
        "Reason",
        "Relevant parameters requiring review",
      ),
    },
    {
      label: "Parameters requiring review",
      value: extractSection(
        message,
        "Relevant parameters requiring review",
        "Recommendation",
      ),
    },
    { label: "Recommendation", value: extractSection(message, "Recommendation") },
  ].filter(section => section.value.length > 0);

  if (sections.length) {
    return sections;
  }

  return [{ label: "Message", value: message.trim() || "No message recorded." }];
}

function extractSection(message: string, label: string, nextLabel?: string) {
  const escapedLabel = escapeRegExp(label);
  const escapedNext = nextLabel ? escapeRegExp(nextLabel) : null;
  const pattern = escapedNext
    ? new RegExp(`${escapedLabel}:\\s*([\\s\\S]*?)(?=\\s*${escapedNext}:|$)`, "i")
    : new RegExp(`${escapedLabel}:\\s*([\\s\\S]*)$`, "i");
  const match = message.match(pattern);

  return match?.[1]?.replace(/\s+/g, " ").replace(/\.$/, "").trim() ?? "";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
