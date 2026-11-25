export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="h-16 w-full bg-brand-500 shadow-sm" />
      <div className="h-10 w-full border-b border-navy-900/5 bg-white" />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 h-8 w-48 animate-pulse rounded-xl bg-navy-900/8" />
        <div className="mb-6 flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 w-28 shrink-0 animate-pulse rounded-full bg-navy-900/6" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-navy-900/8 bg-white p-3">
              <div className="aspect-square w-full animate-pulse rounded-xl bg-navy-900/6" />
              <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-navy-900/8" />
              <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-navy-900/6" />
              <div className="mt-3 h-9 w-full animate-pulse rounded-xl bg-brand-500/20" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
