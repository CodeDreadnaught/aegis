import { Info } from "@phosphor-icons/react/ssr";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type StatusNoteProps = {
  title?: string;
  children: React.ReactNode;
};

export function StatusNote({ title = "Implementation status", children }: StatusNoteProps) {
  return (
    <Alert
      className="mb-6 border-emerald-200 bg-emerald-50/80 text-emerald-950 shadow-sm"
      data-motion="panel"
    >
      <Info aria-hidden="true" className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
