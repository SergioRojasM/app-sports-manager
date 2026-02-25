import type { TenantContactPayload } from '@/types/portal/tenant.types';
import type { TenantSocialPayload } from '@/types/portal/tenant.types';

type TenantContactCardProps = {
  contact: TenantContactPayload;
  social: TenantSocialPayload;
};

function display(value: string | null): string {
  return value && value.trim().length > 0 ? value : '—';
}

type SocialItem = {
  label: string;
  icon: string;
  url: string | null;
};

export function TenantContactCard({ contact, social }: TenantContactCardProps) {
  const hasEmail = Boolean(contact.email && contact.email.trim().length > 0);
  const hasPhone = Boolean(contact.phone && contact.phone.trim().length > 0);
  const hasWebsite = Boolean(contact.websiteUrl && contact.websiteUrl.trim().length > 0);
  const socialItems: SocialItem[] = [
    { label: 'Instagram', icon: 'photo_camera', url: social.instagramUrl },
    { label: 'Facebook', icon: 'thumb_up', url: social.facebookUrl },
    { label: 'X', icon: 'alternate_email', url: social.xUrl },
  ];

  return (
    <article className="rounded-lg border border-portal-border bg-navy-medium/95 p-5 shadow-[0_14px_30px_rgba(0,0,0,0.28)]">
      <header className="mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-turquoise" aria-hidden="true">
          contact_mail
        </span>
        <h3 className="text-lg font-semibold text-slate-100">Contacto y redes sociales</h3>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <dl className="space-y-2.5">
          <div className="flex items-center gap-3 rounded-lg bg-navy-deep/55 px-3 py-2.5">
            <span className="material-symbols-outlined rounded-full bg-primary/20 p-2 text-[18px] text-primary" aria-hidden="true">
              mail
            </span>
            <div className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Correo</dt>
              <dd className="truncate text-sm text-slate-200">
                {hasEmail ? (
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-turquoise underline-offset-2 hover:underline"
                  >
                    {contact.email}
                  </a>
                ) : (
                  display(contact.email)
                )}
              </dd>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-navy-deep/55 px-3 py-2.5">
            <span className="material-symbols-outlined rounded-full bg-primary/20 p-2 text-[18px] text-primary" aria-hidden="true">
              call
            </span>
            <div className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Teléfono</dt>
              <dd className="truncate text-sm text-slate-200">
                {hasPhone ? (
                  <a
                    href={`tel:${contact.phone}`}
                    className="text-turquoise underline-offset-2 hover:underline"
                  >
                    {contact.phone}
                  </a>
                ) : (
                  display(contact.phone)
                )}
              </dd>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-navy-deep/55 px-3 py-2.5">
            <span className="material-symbols-outlined rounded-full bg-primary/20 p-2 text-[18px] text-primary" aria-hidden="true">
              language
            </span>
            <div className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Sitio web</dt>
              <dd className="truncate text-sm text-slate-200">
                {hasWebsite ? (
                  <a
                    href={contact.websiteUrl ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-turquoise underline-offset-2 hover:underline"
                  >
                    {contact.websiteUrl}
                  </a>
                ) : (
                  display(contact.websiteUrl)
                )}
              </dd>
            </div>
          </div>
        </dl>

        <ul className="space-y-2.5">
          {socialItems.map((item) => {
            const hasValue = Boolean(item.url && item.url.trim().length > 0);

            return (
              <li key={item.label} className="flex items-center gap-3 rounded-lg bg-navy-deep/55 px-3 py-2.5">
                <span className="material-symbols-outlined rounded-full bg-primary/20 p-2 text-[18px] text-primary" aria-hidden="true">
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</div>
                  <div className="truncate text-sm text-slate-200">
                    {hasValue ? (
                      <a
                        href={item.url ?? '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-turquoise underline-offset-2 hover:underline"
                      >
                        {item.url}
                      </a>
                    ) : (
                      display(item.url)
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
}
