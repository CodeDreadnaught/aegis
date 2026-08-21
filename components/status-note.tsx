import { Info } from "@phosphor-icons/react/ssr";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type StatusNoteProps = {
  title?: string;
  children: React.ReactNode;
};

export function StatusNote({ title = "Implementation status", children }: StatusNoteProps) {
  return (
    <Alert className="mb-6 border-cyan-200 bg-cyan-50/80 text-cyan-950">
      <Info aria-hidden="true" className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
