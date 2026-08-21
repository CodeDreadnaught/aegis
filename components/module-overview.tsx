import type { Icon } from "@phosphor-icons/react";

import { PageHeader } from "@/components/page-header";
import { StatusNote } from "@/components/status-note";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ModuleOverviewProps = {
  title: string;
  description: string;
  status: string;
  items: Array<{
    title: string;
    description: string;
    icon: Icon;
  }>;
};

export function ModuleOverview({
  title,
  description,
  status,
  items,
}: ModuleOverviewProps) {
  return (
    <>
      <PageHeader description={description} eyebrow="AEGIS module" title={title} />
      <StatusNote>{status}</StatusNote>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Card
              className="bg-card/92 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg"
              key={item.title}
            >
              <CardHeader>
                <div className="mb-4 grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
                  <Icon aria-hidden="true" className="size-5" />
                </div>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-muted-foreground">
                {item.description}
              </CardContent>
            </Card>
          );
        })}
      </section>
    </>
  );
}
