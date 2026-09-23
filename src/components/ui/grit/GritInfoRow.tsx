import type { ElementType, ReactNode } from 'react';
import { GritIconTile } from './GritIconTile';

type GritInfoRowProps = {
  icon: string;
  label: string;
  value: ReactNode;
  as?: ElementType;
};

/** Icon tile + label/value pair from the design's reserve-card Info Row (US-0116). */
export function GritInfoRow({ icon, label, value, as: Tag = 'div' }: GritInfoRowProps) {
  return (
    <Tag className="flex items-center gap-3">
      <GritIconTile icon={icon} size={34} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-grit-body text-[11px] font-semibold text-grit-subtext">{label}</span>
        <span className="font-grit-body text-[13px] font-bold text-grit-text">{value}</span>
      </span>
    </Tag>
  );
}
