/** Loading placeholder for the events ribbon (US-0140, Pencil `ldXx5`). */
export function EventosCintaSkeleton() {
  return (
    <div className="flex gap-6 overflow-hidden px-5 md:justify-center md:px-10" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="flex w-[280px] shrink-0 animate-pulse flex-col overflow-hidden rounded-grit-2xl border border-grit-glass-border bg-grit-card md:w-[300px]"
        >
          <div className="h-[190px] bg-gradient-to-br from-[#122233] via-[#1A2E44] to-[#122233]" />
          <div className="flex flex-col gap-3 p-[18px]">
            <div className="h-5 w-[220px] max-w-full rounded-md bg-[#16283A]" />
            <div className="h-5 w-[150px] rounded-md bg-[#16283A]" />
            <div className="h-3 w-[180px] rounded-md bg-[#16283A]" />
            <div className="h-3 w-[200px] max-w-full rounded-md bg-[#16283A]" />
            <div className="flex items-center justify-between pt-2">
              <div className="h-[22px] w-[110px] rounded-md bg-[#16283A]" />
              <div className="h-10 w-10 rounded-full bg-[#16283A]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
