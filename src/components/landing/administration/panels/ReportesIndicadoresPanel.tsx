const barHeights = [12, 20, 15, 24, 18, 28];

const metrics = [
  { label: 'Tasa de ocupación', value: 78 },
  { label: 'Asistencia promedio', value: 82 },
  { label: 'Renovación de planes', value: 68 },
];

export default function ReportesIndicadoresPanel() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      <p className="font-landing-body text-[9px] font-bold uppercase tracking-wide text-landing-text-muted">
        Indicadores operativos
      </p>

      <div className="flex h-[38px] items-end gap-1">
        {barHeights.map((height, index) => (
          <div
            key={index}
            className="flex-1 rounded-t-sm bg-landing-primary"
            style={{ height: `${height}px` }}
          />
        ))}
      </div>

      <p className="font-landing-body mt-1 text-[9px] font-bold uppercase tracking-wide text-landing-text-muted">
        Principales métricas
      </p>

      <div className="flex flex-col gap-2">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="font-landing-body text-[6.5px] text-landing-text-secondary">{metric.label}</span>
              <span className="font-landing-body text-[6.5px] font-bold text-landing-text">{metric.value}%</span>
            </div>
            <div className="h-[3px] rounded-full bg-landing-border">
              <div className="h-[3px] rounded-full bg-landing-primary" style={{ width: `${metric.value}%` }} />
            </div>
          </div>
        ))}
      </div>

      <p className="font-landing-body text-[6.5px] font-bold text-landing-primary">Crecimiento mensual +16%</p>

      <div className="flex items-center justify-center gap-1 rounded-md border border-landing-primary px-2 py-1.5">
        <span aria-hidden="true" className="material-symbols-outlined text-[10px] text-landing-primary">
          download
        </span>
        <span className="font-landing-body text-[7px] font-semibold text-landing-primary">Exportar reporte</span>
      </div>
    </div>
  );
}
