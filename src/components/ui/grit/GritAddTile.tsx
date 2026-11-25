import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { GritIcon } from './GritIcon';
import { cx, gritFocusRing } from './styles';

type GritAddTileProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'title' | 'type'> & {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Material Symbols name inside the ring (default `add`). */
  icon?: string;
  /** md = grid card (56px ring, Exo 2 19 title) · sm = compact slot (40px ring, 12/600 label). */
  size?: 'md' | 'sm';
};

/**
 * Dashed "add" slot that closes a grid or a row: Escenarios "Agregar escenario" (`qG0T5` `SmgQv`)
 * and Disciplinas "Nivel 04" (`fXuVP` `siF01`). One `<button>`; fills the cell it is placed in.
 */
export function GritAddTile({ title, subtitle, icon = 'add', size = 'md', className, ...rest }: GritAddTileProps) {
  const md = size === 'md';
  return (
    <button
      type="button"
      className={cx(
        'group flex h-full w-full flex-col items-center justify-center rounded-grit-2xl border border-dashed border-white/[0.14] bg-white/[0.015] text-center transition-colors hover:border-grit-cyan/45 hover:bg-grit-cyan/[0.04]',
        md ? 'min-h-[220px] gap-3 p-6' : 'min-h-[120px] gap-2 p-4',
        gritFocusRing,
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden
        className={cx(
          'flex items-center justify-center rounded-full border border-grit-cyan/30 bg-grit-cyan/10 text-grit-cyan transition-shadow group-hover:shadow-[0_0_18px_rgba(20,219,196,0.25)]',
          md ? 'h-14 w-14' : 'h-10 w-10',
        )}
      >
        <GritIcon name={icon} size={md ? 22 : 18} />
      </span>
      <span
        className={cx(
          md ? 'font-grit-title text-[19px] font-medium text-grit-text' : 'font-grit-body text-xs font-semibold text-grit-subtext',
        )}
      >
        {title}
      </span>
      {subtitle && <span className="font-grit-body text-xs text-grit-muted">{subtitle}</span>}
    </button>
  );
}
