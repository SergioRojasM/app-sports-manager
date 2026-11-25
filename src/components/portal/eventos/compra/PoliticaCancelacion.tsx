import { GritIcon, cx } from '@/components/ui';
import { politicaCancelacionTexto } from '@/lib/portal/eventos-ticket-pdf';

type PoliticaCancelacionProps = {
  horas: number | null;
  className?: string;
};

/** Cancellation policy line (US-0121): null hours → no cancellation and no refund. */
export function PoliticaCancelacion({ horas, className }: PoliticaCancelacionProps) {
  return (
    <p className={cx('flex items-start gap-1.5 font-grit-body text-xs text-grit-subtext', className)}>
      <GritIcon name={horas === null ? 'block' : 'event_busy'} size={14} className="mt-px shrink-0 text-grit-cyan" />
      {politicaCancelacionTexto(horas)}
    </p>
  );
}
