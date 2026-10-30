export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Carregando">
      <div className="h-8 w-56 rounded-md bg-zinc-800/60" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-line bg-panel" />
        ))}
      </div>
      <div className="h-72 rounded-xl border border-line bg-panel" />
    </div>
  );
}
