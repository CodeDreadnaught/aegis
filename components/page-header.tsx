type PageHeaderProps = {
  title: string;
  description: string;
  eyebrow?: string;
};

export function PageHeader({ title, description, eyebrow }: PageHeaderProps) {
  return (
    <div className="mb-6" data-motion="reveal">
      {eyebrow && (
        <p className="aegis-kicker mb-2">
          {eyebrow}
        </p>
      )}
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
