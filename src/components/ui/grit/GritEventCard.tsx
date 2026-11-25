import Link from 'next/link';
import type { ReactNode } from 'react';
import { GritAvatar } from './GritAvatar';
import { GritDateTile } from './GritDateTile';
import { GritIcon } from './GritIcon';
import { GritMediaCard } from './GritMediaCard';
import { GritOverlayPill } from './GritOverlayPill';
import { cx, gritFocusRing } from './styles';

type GritEventCardVariant = 'hero' | 'compact' | 'grid';

type GritEventCardProps = {
  /** hero `zRDg2` 744×330 · compact `R1QegD` 360×157 · grid `uCKmV` 268×312. */
  variant: GritEventCardVariant;
  title: string;
  /** Detail page. grid = the whole card is the link · compact = round arrow · hero = the title. */
  href?: string;
  image?: string | null;
  placeholderIcon?: string;
  /** ISO instant for the date tile (Bogotá); null = "Por definir". */
  dateIso: string | null;
  /** Pills shown top-left (hero / compact). */
  badges?: ReactNode;
  /** Organizer line above the hero title. */
  organizer?: { name: string; logoUrl?: string | null };
  /** hero = row of meta pills · grid = icon + place line. */
  meta?: ReactNode;
  /** Price summary: top-right pill on grid cards, pill before the actions on hero cards. */
  price?: string | null;
  /** hero only: action controls (e.g. "Obtener entrada"). Never nested in a link. */
  actions?: ReactNode;
  headingLevel?: 2 | 3;
  className?: string;
};

/**
 * Event card family from v3 (`zRDg2` / `R1QegD` / `uCKmV`), built on GritMediaCard, GritOverlayPill
 * and GritDateTile. Generic content only — mapping from domain models lives in feature code.
 */
export function GritEventCard({
  variant,
  title,
  href,
  image,
  placeholderIcon,
  dateIso,
  badges,
  organizer,
  meta,
  price,
  actions,
  headingLevel = 3,
  className,
}: GritEventCardProps) {
  const Heading = `h${headingLevel}` as 'h2' | 'h3';

  if (variant === 'grid') {
    const card = (
      <GritMediaCard
        image={image}
        placeholderIcon={placeholderIcon}
        radius="lg"
        padding={14}
        className={cx('h-[312px] transition duration-200', href && 'group-hover:border-white/25')}
        top={
          <>
            <GritDateTile dateIso={dateIso} size="md" />
            {price ? <GritOverlayPill>{price}</GritOverlayPill> : null}
          </>
        }
        bottom={
          <div className="flex min-w-0 flex-col gap-1.5">
            <Heading className="line-clamp-2 font-grit-body text-[15px] font-semibold leading-snug text-grit-text">{title}</Heading>
            {meta ? <div className="flex min-w-0 items-center gap-1.5 font-grit-body text-[11px] text-grit-subtext">{meta}</div> : null}
          </div>
        }
      />
    );
    if (!href) return <div className={className}>{card}</div>;
    return (
      <Link href={href} className={cx('group block rounded-[24px]', gritFocusRing, className)}>
        {card}
      </Link>
    );
  }

  if (variant === 'compact') {
    return (
      <GritMediaCard
        as="article"
        image={image}
        placeholderIcon={placeholderIcon}
        radius="lg"
        padding={16}
        className={cx('h-[157px]', className)}
        top={
          <>
            <div className="flex min-w-0 flex-wrap gap-2">{badges}</div>
            <GritDateTile dateIso={dateIso} size="md" />
          </>
        }
        bottom={
          <div className="flex items-end justify-between gap-3">
            <Heading className="min-w-0 truncate font-grit-title text-xl font-medium italic leading-tight text-grit-text">{title}</Heading>
            {href ? (
              <Link
                href={href}
                aria-label={`Ver ${title}`}
                className={cx(
                  'inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-white/20 bg-grit-bg/45 text-grit-text backdrop-blur-[14px] transition hover:bg-grit-bg/70',
                  "after:absolute after:inset-0 after:content-['']",
                  gritFocusRing,
                )}
              >
                <GritIcon name="arrow_outward" size={16} />
              </Link>
            ) : null}
          </div>
        }
      />
    );
  }

  return (
    <GritMediaCard
      as="article"
      image={image}
      placeholderIcon={placeholderIcon}
      radius="xl"
      stroke="accent"
      padding={24}
      className={cx('min-h-[330px]', className)}
      top={
        <>
          <div className="flex min-w-0 flex-wrap gap-2">{badges}</div>
          <GritDateTile dateIso={dateIso} size="lg" />
        </>
      }
      bottom={
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="flex min-w-0 max-w-full flex-col gap-3">
            {organizer ? (
              <div className="flex min-w-0 items-center gap-2">
                <GritAvatar name={organizer.name} src={organizer.logoUrl} tone="org" size={26} />
                <span className="truncate font-grit-body text-xs font-medium text-grit-subtext">{organizer.name}</span>
              </div>
            ) : null}
            <Heading className="line-clamp-2 font-grit-title text-[32px] font-semibold italic leading-none text-grit-text sm:text-[48px]">
              {href ? (
                <Link href={href} className={cx('rounded-grit-sm hover:text-grit-cyan-light', gritFocusRing)}>
                  {title}
                </Link>
              ) : (
                title
              )}
            </Heading>
            {meta ? <div className="flex flex-wrap gap-2">{meta}</div> : null}
          </div>
          {price || actions ? (
            <div className="flex flex-wrap items-center gap-2.5">
              {price ? <GritOverlayPill size="lg">{price}</GritOverlayPill> : null}
              {actions}
            </div>
          ) : null}
        </div>
      }
    />
  );
}
