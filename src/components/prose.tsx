export function Prose({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-16">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      {updated && (
        <p className="mt-1 text-xs text-muted-foreground">Last updated {updated}</p>
      )}
      <div className="prose-obi mt-6 space-y-4 text-sm leading-relaxed text-foreground/90 [&_a]:text-primary [&_a:hover]:underline [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5">
        {children}
      </div>
    </div>
  );
}
