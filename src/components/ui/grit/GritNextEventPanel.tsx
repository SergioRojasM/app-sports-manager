'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { GritIcon } from './GritIcon';
import { cx, gritFocusRing } from './styles';

/** 32px glass round button over the cover (`F4ySZ`). */
const COVER_ACTION_CLASS = cx(
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-grit-bg/45 text-grit-text backdrop-blur-[14px] transition hover:bg-grit-bg/70',
  gritFocusRing,
);

export type GritNextEventMeter = {
  icon: string;
  label: string;
  /** `null` renders "—" (e.g. the counter failed). */
  value: number | null;
  /** Total for "value / total" and the track; omit to show `caption` instead of the track. */
  total?: number | null;
  /** Shown instead of the track when there is no total, e.g. "Sin límite". */
  caption?: string;
};

type GritNextEventPanelProps = {
  /** Label pill over the cover, e.g. "PRÓXIMO EVENTO". */
  label: string;
  image?: string | null;
  /** Round action over the cover (edit). */
  coverAction?: { icon: string; label: string; href?: string; onClick?: () => void };
  title: string;
  subtitle?: ReactNode;
  tags?: ReactNode;
  meters?: GritNextEventMeter[];
  /** Stacked actions at the bottom (primary first). */
  actions?: ReactNode;
  headingLevel?: 2 | 3;
  className?: string;
};

function Meter({ icon, label, value, total, caption }: GritNextEventMeter) {
  const pct = value !== null && total ? Math.min(100, Math.max(0, (value / total) * 100)) : 0;
  return (
    <div className="flex flex-col gap-[9px] rounded-[16px] border border-white/[0.06] bg-white/[0.025] p-3.5">
      <div className="flex items-end justify-between gap-2">
        <span className="flex items-center gap-1.5 font-grit-body text-[11px] text-grit-subtext">
          <GritIcon name={icon} size={13} className="text-grit-muted" />
          {label}
        </span>
        <span className="flex items-baseline gap-1">
          <span className="font-grit-title text-[22px] leading-none text-grit-text">{value ?? '—'}</span>
          {total !== null && total !== undefined && (
            <span className="font-grit-body text-[11px] text-grit-muted">/ {total}</span>
          )}
        </span>
      </div>
      {total !== null && total !== undefined ? (
        <div
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={value ?? undefined}
          className="h-[5px] overflow-hidden rounded-full bg-white/[0.08]"
        >
          <div
            className="h-full rounded-full bg-grit-cyan shadow-[0_0_8px_rgba(20,219,196,0.5)]"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : (
        caption && <span className="font-grit-body text-[11px] text-grit-muted">{caption}</span>
      )}
    </div>
  );
}

/**
 * "Next event" side panel of the admin calendar, from v3 Next Event Panel (`s2Gt8L`, frame `ZYxt2`):
 * 200px photo cover fading into the surface, tags, inset meters and actions stacked at the bottom.
 * Generic content only — feature code maps the event to these props.
 */
export function GritNextEventPanel({
  label,
  image,
  coverAction,
  title,
  subtitle,
  tags,
  meters = [],
  actions,
  headingLevel = 2,
  className,
}: GritNextEventPanelProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(image) && failedSrc !== image;
  const Heading = `h${headingLevel}` as const;

  return (
    <section
      aria-label={label}
      className={cx(
        'flex flex-col overflow-hidden rounded-[26px] border border-grit-cyan/25 bg-gradient-to-b from-grit-surface to-grit-surface-deep shadow-[0_20px_48px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(20,219,196,0.2)]',
        className,
      )}
    >
      <div className="relative isolate flex h-[200px] shrink-0 flex-col justify-between p-4">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image ?? undefined}
            alt=""
            loading="lazy"
            onError={() => setFailedSrc(image ?? null)}
            className="absolute inset-0 -z-10 h-full w-full object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(20,219,196,0.14),transparent_55%),linear-gradient(160deg,#111A21,#080C10)]"
          >
            <GritIcon name="event" size={44} className="text-grit-cyan/35" />
          </div>
        )}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(8,12,16,0.45)_0%,rgba(8,12,16,0)_35%,rgba(11,17,22,0.75)_75%,#111A21_100%)]"
        />
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-grit-bg/45 px-[11px] py-1.5 font-grit-body text-[10px] font-bold uppercase tracking-[1px] text-grit-text backdrop-blur-[14px]">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-grit-cyan shadow-[0_0_6px_rgba(20,219,196,0.8)]" />
            {label}
          </span>
          {coverAction &&
            (coverAction.href ? (
              <Link
                href={coverAction.href}
                onClick={coverAction.onClick}
                aria-label={coverAction.label}
                className={COVER_ACTION_CLASS}
              >
                <GritIcon name={coverAction.icon} size={14} />
              </Link>
            ) : (
              <button type="button" onClick={coverAction.onClick} aria-label={coverAction.label} className={COVER_ACTION_CLASS}>
                <GritIcon name={coverAction.icon} size={14} />
              </button>
            ))}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <Heading className="truncate font-grit-title text-[32px] font-semibold italic leading-none text-grit-text">
            {title}
          </Heading>
          {subtitle && <div className="font-grit-body text-xs text-grit-subtext">{subtitle}</div>}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3.5 px-[18px] pb-[18px] pt-4">
        {tags && <div className="flex flex-wrap gap-1.5">{tags}</div>}
        {meters.map((meter) => (
          <Meter key={meter.label} {...meter} />
        ))}
        {actions && <div className="mt-auto flex flex-col gap-2 pt-2">{actions}</div>}
      </div>
    </section>
  );
}
