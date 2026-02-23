import type { OrganizationIdentityPayload } from '@/types/portal/organization-view.types';
import type { OrganizationContextPayload } from '@/types/portal/organization-view.types';

type OrganizationIdentityCardProps = {
  identity: OrganizationIdentityPayload;
  context: OrganizationContextPayload;
};

function formatDate(dateValue: string | null): string {
  if (!dateValue) return '—';

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return '—';

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(parsed);
}

function display(value: string | null): string {
  return value && value.trim().length > 0 ? value : '—';
}

export function OrganizationIdentityCard({ identity, context }: OrganizationIdentityCardProps) {
  return (
    <article className="overflow-hidden rounded-lg border border-portal-border bg-navy-medium/95 shadow-[0_14px_30px_rgba(0,0,0,0.28)]">
      <div className="relative h-24 bg-gradient-to-r from-primary/45 to-turquoise/35">
        <div className="absolute left-4 top-4 rounded-lg bg-navy-deep p-1.5">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-portal-border bg-navy-soft">
            {identity.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={identity.logoUrl}
                alt={`${identity.name} logo`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="material-symbols-outlined text-2xl text-slate-400" aria-hidden="true">
                shield
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          aria-label="Edit organization banner (coming soon)"
          className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-slate-100"
          onClick={(event) => event.preventDefault()}
        >
          <span className="material-symbols-outlined text-xs" aria-hidden="true">
            photo_camera
          </span>
          Edit Banner
        </button>
      </div>

      <div className="space-y-4 px-4 pb-5 pt-3">
        <div>
          <h3 className="text-[26px] leading-tight font-bold text-slate-100">{display(identity.name)}</h3>
          <span className="mt-2 inline-block rounded-full bg-turquoise/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-turquoise">
            {display(identity.description)}
          </span>
        </div>

        <dl className="space-y-2.5">
          <div className="flex items-center gap-3 rounded-lg bg-navy-deep/55 px-3 py-2.5">
            <span className="material-symbols-outlined rounded-full bg-primary/20 p-2 text-[18px] text-primary" aria-hidden="true">
              calendar_month
            </span>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Founded</dt>
              <dd className="text-sm font-medium text-slate-200">{formatDate(identity.foundedAt)}</dd>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-navy-deep/55 px-3 py-2.5">
            <span className="material-symbols-outlined rounded-full bg-primary/20 p-2 text-[18px] text-primary" aria-hidden="true">
              person
            </span>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Head Coach</dt>
              <dd className="text-sm font-medium text-slate-200">{display(context.headCoachName)}</dd>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-navy-deep/55 px-3 py-2.5">
            <span className="material-symbols-outlined rounded-full bg-primary/20 p-2 text-[18px] text-primary" aria-hidden="true">
              location_on
            </span>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Location</dt>
              <dd className="text-sm font-medium text-slate-200">{display(context.location)}</dd>
            </div>
          </div>
        </dl>
      </div>
    </article>
  );
}
