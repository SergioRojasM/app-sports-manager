import { GritCard, GritIconTile } from '@/components/ui';

const PASOS = [
  { numero: '01', icon: 'event_upcoming', titulo: 'Elige el evento', descripcion: 'Abre el control de un evento confirmado.' },
  { numero: '02', icon: 'qr_code_scanner', titulo: 'Escanea o digita', descripcion: 'Lee el QR con la cámara o escribe el código EV-.' },
  { numero: '03', icon: 'task_alt', titulo: 'Registra el ingreso', descripcion: 'El contador se actualiza en tiempo real.' },
] as const;

/** "Cómo funciona" strip under the check-in selector (grit-arena-v3 `LV7I0` `lIT8g`). */
export function CheckinPasos() {
  return (
    <section aria-labelledby="checkin-pasos-titulo" className="flex flex-col gap-3 pt-1.5">
      <h2 id="checkin-pasos-titulo" className="sr-only">
        Cómo funciona
      </h2>
      <ol className="grid gap-3.5 md:grid-cols-3">
        {PASOS.map((paso) => (
          <li key={paso.numero}>
            <GritCard variant="card" padding="none" className="flex h-full items-start gap-3.5 px-5 py-[18px]">
              <GritIconTile icon={paso.icon} size={40} shape="circle" tone="accent" />
              <div className="flex min-w-0 flex-col gap-1">
                <p className="flex items-center gap-2">
                  <span className="font-grit-mono text-[11px] font-semibold text-grit-cyan">{paso.numero}</span>
                  <span className="font-grit-body text-sm font-semibold text-grit-text">{paso.titulo}</span>
                </p>
                <p className="font-grit-body text-xs text-grit-muted">{paso.descripcion}</p>
              </div>
            </GritCard>
          </li>
        ))}
      </ol>
    </section>
  );
}
