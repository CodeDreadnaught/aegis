type PageHeaderProps = {
  title: string;
  description: string;
  eyebrow?: string;
};

export function PageHeader({ title, description, eyebrow }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {eyebrow && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          {eyebrow}
        </p>
      )}
      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
