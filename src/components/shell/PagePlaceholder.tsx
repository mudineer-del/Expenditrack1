export function PagePlaceholder({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{note}</p>
    </div>
  )
}
