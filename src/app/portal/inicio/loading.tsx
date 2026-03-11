export default function InicioLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Stats row skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card rounded-md p-4 flex items-center gap-4">
            <div className="size-11 rounded-md bg-slate-700/40" />
            <div className="space-y-2 flex-1">
              <div className="h-2 w-20 bg-slate-700/40 rounded" />
              <div className="h-5 w-10 bg-slate-700/40 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Main grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          <div className="glass-card rounded-md p-6 h-48 bg-slate-700/20" />
          <div className="glass-card rounded-md p-6 h-40 bg-slate-700/20" />
          <div className="glass-card rounded-md p-6 h-56 bg-slate-700/20" />
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-md h-56 bg-slate-700/20" />
          <div className="glass-card rounded-md p-6 h-64 bg-slate-700/20" />
        </div>
      </div>
    </div>
  );
}
