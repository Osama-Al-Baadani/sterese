import { Search, Star } from "lucide-react";

/**
 * A representative illustration of the app's UI, built from CSS shapes
 * rather than a real screenshot — keeps this from going stale as the app's
 * screens evolve, while still reading as "an app" at a glance.
 */
export default function PhoneMockup() {
  return (
    <div className="relative mx-auto w-64 select-none sm:w-72">
      <div className="relative rounded-[2.5rem] border-[10px] border-navy-900 bg-navy-900 shadow-2xl shadow-navy-900/30">
        <div className="absolute top-0 left-1/2 z-10 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-navy-900" />
        <div className="overflow-hidden rounded-[1.9rem] bg-brand-50">
          <div className="space-y-3 p-3 pt-6">
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
              <Search className="h-3.5 w-3.5 text-navy-300" aria-hidden />
              <div className="h-2 w-20 rounded-full bg-navy-900/10" />
            </div>

            <div className="flex h-24 items-center justify-center rounded-2xl bg-gradient-to-l from-gold-500 to-gold-400 p-3">
              <div className="space-y-1.5 text-right">
                <div className="ms-auto h-2 w-24 rounded-full bg-white/70" />
                <div className="ms-auto h-2 w-16 rounded-full bg-white/50" />
              </div>
            </div>

            <div className="flex justify-between px-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div className="h-9 w-9 rounded-full bg-white shadow-sm" />
                  <div className="h-1.5 w-8 rounded-full bg-navy-900/10" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-white p-2 shadow-sm">
                  <div className="mb-2 h-14 rounded-lg bg-navy-900/5" />
                  <div className="mb-1 h-1.5 w-3/4 rounded-full bg-navy-900/10" />
                  <div className="flex items-center justify-between">
                    <div className="h-1.5 w-8 rounded-full bg-brand-600/40" />
                    <Star className="h-2.5 w-2.5 fill-gold-500 text-gold-500" aria-hidden />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
