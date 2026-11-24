import { GritCard } from '@/components/ui';

const BAR = 'rounded-full bg-white/[0.06]';

/** v3 skeleton mirroring the `/portal/inicio` layout (frame `lhbhK`); static under reduced motion. */
export default function InicioLoading() {
  return (
    <div className="flex flex-col gap-6 motion-safe:animate-pulse" aria-busy="true" aria-label="Cargando inicio">
      {/* Welcome */}
      <div className="flex flex-col gap-3">
        <div className={`${BAR} h-9 w-64 sm:h-11`} />
        <div className={`${BAR} h-3.5 w-full max-w-[460px]`} />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <GritCard
            key={i}
            variant={i === 2 ? 'highlight' : 'card'}
            padding="none"
            className="flex h-[154px] flex-col justify-between rounded-grit-3xl p-[22px]"
          >
            <div className="flex justify-between">
              <div className="h-9 w-9 rounded-full bg-white/[0.06]" />
              <div className="h-9 w-9 rounded-full bg-white/[0.06]" />
            </div>
            <div className="flex items-end gap-3.5">
              <div className="h-12 w-8 rounded-[8px] bg-white/[0.06]" />
              <div className="flex flex-col gap-2 pb-1">
                <div className={`${BAR} h-3 w-32`} />
                <div className={`${BAR} h-2.5 w-20`} />
              </div>
            </div>
          </GritCard>
        ))}
      </div>

      {/* Agenda | right column */}
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <GritCard variant="card" padding="none" className="flex flex-col gap-4 rounded-grit-3xl p-[22px]">
          <div className={`${BAR} h-4 w-48`} />
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-16 rounded-[18px] bg-white/[0.04]" />
            ))}
          </div>
          <div className="h-[365px] rounded-[16px] bg-white/[0.025]" />
        </GritCard>
        <div className="flex flex-col gap-4">
          <GritCard variant="card" padding="none" className="h-[374px] rounded-grit-3xl p-[22px]">
            <div className={`${BAR} h-4 w-40`} />
          </GritCard>
          <GritCard variant="card" padding="none" className="h-[153px] rounded-grit-3xl p-[22px]">
            <div className={`${BAR} h-4 w-40`} />
          </GritCard>
        </div>
      </div>
    </div>
  );
}
