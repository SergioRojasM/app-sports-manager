'use client';

import { useState } from 'react';
import { GritCard, GritIcon, GritIconButton, GritSectionHeading, GritTag, cx, gritFocusRing } from '@/components/ui';
import type { TenantContactPayload, TenantSocialPayload } from '@/types/portal/tenant.types';

type TenantContactCardProps = {
  contact: TenantContactPayload;
  social: TenantSocialPayload;
  isPublic?: boolean;
  /** Opens the organization edit drawer ("Conectar" on an empty item). */
  onConnect: () => void;
};

type ContactItem = {
  key: string;
  label: string;
  icon: string;
  value: string | null;
  action: 'copy' | 'open';
  copiedMessage?: string;
};

function clean(value: string | null): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

/** "https://www.instagram.com/club/" → "instagram.com/club" */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
}

function toHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** Contact & social card (`aYwNn` `ONRJQ`): two columns of items with copy / open actions, or "Conectar". */
export function TenantContactCard({ contact, social, isPublic, onConnect }: TenantContactCardProps) {
  const [announcement, setAnnouncement] = useState('');

  const items: ContactItem[] = [
    { key: 'email', label: 'Correo', icon: 'mail', value: clean(contact.email), action: 'copy', copiedMessage: 'Correo copiado' },
    { key: 'phone', label: 'Teléfono', icon: 'call', value: clean(contact.phone), action: 'copy', copiedMessage: 'Teléfono copiado' },
    { key: 'web', label: 'Sitio web', icon: 'language', value: clean(contact.websiteUrl), action: 'open' },
    { key: 'instagram', label: 'Instagram', icon: 'photo_camera', value: clean(social.instagramUrl), action: 'open' },
    { key: 'facebook', label: 'Facebook', icon: 'thumb_up', value: clean(social.facebookUrl), action: 'open' },
    { key: 'x', label: 'X', icon: 'alternate_email', value: clean(social.xUrl), action: 'open' },
  ];

  const copy = async (item: ContactItem) => {
    if (!item.value) return;
    try {
      if (!navigator.clipboard) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(item.value);
      setAnnouncement(item.copiedMessage ?? 'Copiado');
    } catch {
      setAnnouncement('No se pudo copiar');
    }
  };

  return (
    <GritCard variant="card" padding="none" className="flex flex-col gap-[18px] p-[22px]" as="article">
      <GritSectionHeading
        icon="contact_page"
        title="Contacto y redes sociales"
        subtitle="Así te encuentran tus atletas en el marketplace."
        action={
          isPublic ? (
            <GritTag tone="accent" dot>
              Perfil público
            </GritTag>
          ) : undefined
        }
      />
      <ul className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-flow-col sm:grid-cols-2 sm:grid-rows-3">
        {items.map((item) => (
          <li
            key={item.key}
            className="flex min-h-12 items-center gap-3 rounded-[14px] border border-white/[0.06] bg-white/[0.025] px-3.5 py-2"
          >
            <span aria-hidden className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-grit-cyan/10 text-grit-cyan">
              <GritIcon name={item.icon} size={14} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-grit-body text-[9px] font-semibold uppercase tracking-[1.2px] text-grit-muted">{item.label}</span>
              {item.value ? (
                <span className="truncate font-grit-body text-[13px] font-medium text-grit-text">
                  {item.action === 'open' ? displayUrl(item.value) : item.value}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onConnect}
                  className={cx(
                    'inline-flex items-center gap-1 self-start rounded-full font-grit-body text-xs font-semibold text-grit-cyan hover:underline',
                    gritFocusRing,
                  )}
                  aria-label={`Conectar ${item.label}`}
                >
                  <GritIcon name="add" size={12} />
                  Conectar
                </button>
              )}
            </div>
            {item.value && item.action === 'copy' ? (
              <GritIconButton icon="content_copy" label={`Copiar ${item.label.toLowerCase()}`} size="sm" variant="ghost" onClick={() => void copy(item)} />
            ) : null}
            {item.value && item.action === 'open' ? (
              <GritIconButton
                icon="open_in_new"
                label={`Abrir ${item.label} en una pestaña nueva`}
                size="sm"
                variant="ghost"
                href={toHref(item.value)}
                external
              />
            ) : null}
          </li>
        ))}
      </ul>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </GritCard>
  );
}
