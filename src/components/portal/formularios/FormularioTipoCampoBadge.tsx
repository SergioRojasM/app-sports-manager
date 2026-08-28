import type { FormularioTipoCampo } from '@/types/portal/formularios.types';
import { FORMULARIO_TIPO_CAMPO_LABELS } from '@/types/portal/formularios.types';

const TIPO_ICONS: Record<FormularioTipoCampo, string> = {
  fecha: 'calendar_month',
  texto_corto: 'short_text',
  texto_largo: 'notes',
  numerico: 'tag',
  imagen: 'image',
  lista: 'list',
  checkbox: 'check_box',
  seleccion: 'radio_button_checked',
};

type FormularioTipoCampoBadgeProps = {
  tipo: FormularioTipoCampo;
};

export function FormularioTipoCampoBadge({ tipo }: FormularioTipoCampoBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-portal-border bg-navy-medium/60 px-2.5 py-0.5 text-xs font-medium text-slate-300">
      <span className="material-symbols-outlined text-sm" aria-hidden="true">
        {TIPO_ICONS[tipo]}
      </span>
      {FORMULARIO_TIPO_CAMPO_LABELS[tipo]}
    </span>
  );
}
