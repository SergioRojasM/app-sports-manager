'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { GritDivider, GritIcon, cx, gritFocusRing } from '@/components/ui';
import type { PortalTenantNav, UsePortalNavigationResult } from '@/hooks/portal/usePortalNavigation';
import type { PortalNavGroupId, ResolvedNavGroup, ResolvedNavLeaf } from '@/types/portal.types';

export type PortalNavVariant = 'sidebar' | 'drawer';

type PortalNavContentProps = {
  variant: PortalNavVariant;
  nav: UsePortalNavigationResult;
  onNavigate?: () => void;
};

/** Drawer rows are taller so every touch target is at least 40px (US-0138). */
const SIZES: Record<PortalNavVariant, { item: string; group: string; child: string; leafIcon: number }> = {
  sidebar: { item: 'py-2.5 text-sm', group: 'py-2 text-[13px]', child: 'py-1.5 text-[12.5px]', leafIcon: 16 },
  drawer: { item: 'py-3 text-[15px]', group: 'py-3 text-sm', child: 'py-2.5 text-[13.5px]', leafIcon: 17 },
};

const overlineClass = 'px-2 font-grit-body text-[10px] font-semibold uppercase tracking-[2px] text-grit-muted';

/**
 * Navigation body shared by PortalSidebar (desktop) and PortalMobileDrawer (mobile):
 * global "MENÚ" + the tenant "ORGANIZACIÓN" tree (designs E73seM / AGzMs).
 */
export function PortalNavContent({ variant, nav, onNavigate }: PortalNavContentProps) {
  const { globalItems, activeHref, tenantNav, tenantLoading, activeGroupId } = nav;
  const sizes = SIZES[variant];
  const menuListId = useId();
  const [menuOpen, setMenuOpen] = useState(true);

  return (
    <nav aria-label="Menú del portal" className="flex flex-col gap-1.5 font-grit-body">
      <button
        type="button"
        aria-expanded={menuOpen}
        aria-controls={menuListId}
        onClick={() => setMenuOpen((prev) => !prev)}
        className={cx(
          overlineClass,
          'flex w-full items-center justify-between rounded-grit-xs text-left transition-colors hover:text-grit-subtext',
          variant === 'drawer' ? 'py-3.5' : 'py-1',
          gritFocusRing,
        )}
      >
        Menú
        <GritIcon name={menuOpen ? 'expand_less' : 'expand_more'} size={14} />
      </button>
      {menuOpen && (
        <ul id={menuListId} className="flex flex-col gap-0.5">
          {globalItems.map((item) => {
            const isActive = item.href === activeHref;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={onNavigate}
                  className={cx(
                    'flex items-center gap-3 rounded-grit-md border px-3 transition-colors',
                    sizes.item,
                    // Active item mirrors the design's "Nav Operación" state (zfVKC)
                    isActive
                      ? 'border-grit-glass-border bg-gradient-to-r from-grit-cyan/15 to-transparent font-semibold text-grit-text'
                      : 'border-transparent font-medium text-grit-subtext hover:bg-grit-cyan/10 hover:text-grit-text',
                    gritFocusRing,
                  )}
                >
                  <GritIcon name={item.icon} size={18} className={isActive ? 'text-grit-cyan' : 'text-grit-subtext'} />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {(tenantNav || tenantLoading) && (
        <>
          <GritDivider className="my-2" />
          <p className={overlineClass}>Organización</p>
          {tenantNav ? (
            <OrgSection
              // Remount per tenant so expansion state starts fresh in each organization
              key={tenantNav.tenantId}
              variant={variant}
              tenantNav={tenantNav}
              activeHref={activeHref}
              activeGroupId={activeGroupId}
              onNavigate={onNavigate}
            />
          ) : (
            <div aria-hidden className="h-[58px] animate-pulse rounded-grit-lg bg-grit-glass" />
          )}
        </>
      )}
    </nav>
  );
}

type OrgSectionProps = {
  variant: PortalNavVariant;
  tenantNav: PortalTenantNav;
  activeHref: string | null;
  activeGroupId: PortalNavGroupId | null;
  onNavigate?: () => void;
};

function OrgSection({ variant, tenantNav, activeHref, activeGroupId, onNavigate }: OrgSectionProps) {
  const bodyId = useId();
  const sizes = SIZES[variant];
  const [orgOpen, setOrgOpen] = useState(true);
  // Groups start collapsed except the one holding the active link
  const [openGroups, setOpenGroups] = useState<Set<PortalNavGroupId>>(
    () => new Set(activeGroupId ? [activeGroupId] : []),
  );
  const [lastActiveGroupId, setLastActiveGroupId] = useState(activeGroupId);

  // Navigating into another group force-expands it (and the section); other groups keep their state
  if (activeGroupId !== lastActiveGroupId) {
    setLastActiveGroupId(activeGroupId);
    if (activeGroupId) {
      setOrgOpen(true);
      setOpenGroups((prev) => new Set(prev).add(activeGroupId));
    }
  }

  const toggleGroup = (id: PortalNavGroupId) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const { tenantName, tenantNameLoading } = tenantNav;

  return (
    <div className="flex flex-col gap-0.5 rounded-grit-lg border border-grit-glass-border bg-grit-glass p-1.5">
      <button
        type="button"
        aria-expanded={orgOpen}
        aria-controls={bodyId}
        onClick={() => setOrgOpen((prev) => !prev)}
        className={cx(
          'flex w-full items-center gap-2.5 rounded-grit-md p-2 text-left transition-colors hover:bg-grit-cyan/5',
          gritFocusRing,
        )}
      >
        {/* Static tile instead of the tenant logo: the menu never loads images (US-0138) */}
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-grit-sm border border-grit-glass-border bg-grit-cyan/10">
          <GritIcon name="shield" size={16} className="text-grit-cyan" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="text-[13px] font-semibold text-grit-text">Organización</span>
          {tenantName ? (
            <span className="truncate text-[11px] font-medium text-grit-cyan" title={tenantName}>
              {tenantName}
            </span>
          ) : (
            tenantNameLoading && (
              <span aria-hidden className="mt-1 h-2.5 w-24 animate-pulse rounded-full bg-grit-glass-border" />
            )
          )}
        </span>
        <GritIcon name={orgOpen ? 'expand_less' : 'expand_more'} size={16} className="text-grit-subtext" />
      </button>

      {orgOpen && (
        <ul id={bodyId} className="flex flex-col gap-0.5">
          {tenantNav.nodes.map((node) =>
            node.kind === 'group' ? (
              <NavGroup
                key={node.id}
                group={node}
                variant={variant}
                open={openGroups.has(node.id)}
                containsActive={node.id === activeGroupId}
                activeHref={activeHref}
                onToggle={() => toggleGroup(node.id)}
                onNavigate={onNavigate}
              />
            ) : (
              <li key={node.href}>
                <NavTopLeaf leaf={node} sizeClass={sizes.group} iconSize={sizes.leafIcon} isActive={node.href === activeHref} onNavigate={onNavigate} />
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

type NavGroupProps = {
  group: ResolvedNavGroup;
  variant: PortalNavVariant;
  open: boolean;
  containsActive: boolean;
  activeHref: string | null;
  onToggle: () => void;
  onNavigate?: () => void;
};

function NavGroup({ group, variant, open, containsActive, activeHref, onToggle, onNavigate }: NavGroupProps) {
  const listId = useId();
  const sizes = SIZES[variant];

  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={onToggle}
        className={cx(
          'flex w-full items-center gap-2.5 rounded-grit-sm px-2.5 text-left font-semibold text-grit-text transition-colors hover:bg-grit-cyan/5',
          sizes.group,
          gritFocusRing,
        )}
      >
        <GritIcon name={group.icon} size={sizes.leafIcon} className={containsActive ? 'text-grit-cyan' : 'text-grit-subtext'} />
        <span className="flex-1 truncate">{group.label}</span>
        <GritIcon name={open ? 'expand_more' : 'chevron_right'} size={15} className="text-grit-subtext" />
      </button>

      {open && (
        <ul id={listId} className="mb-1 ml-[18px] flex flex-col gap-px border-l border-white/[0.08] pl-2">
          {group.children.map((child) => {
            const isActive = child.href === activeHref;
            return (
              <li key={child.href}>
                <Link
                  href={child.href}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={onNavigate}
                  className={cx(
                    'block truncate rounded-grit-xs px-2.5 transition-colors',
                    sizes.child,
                    isActive
                      ? 'bg-grit-cyan/10 font-semibold text-grit-cyan'
                      : 'text-grit-subtext hover:bg-grit-cyan/5 hover:text-grit-text',
                    gritFocusRing,
                  )}
                >
                  {child.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

type NavTopLeafProps = {
  leaf: ResolvedNavLeaf;
  sizeClass: string;
  iconSize: number;
  isActive: boolean;
  onNavigate?: () => void;
};

function NavTopLeaf({ leaf, sizeClass, iconSize, isActive, onNavigate }: NavTopLeafProps) {
  return (
    <Link
      href={leaf.href}
      aria-current={isActive ? 'page' : undefined}
      onClick={onNavigate}
      className={cx(
        'flex items-center gap-2.5 rounded-grit-sm px-2.5 font-semibold transition-colors',
        sizeClass,
        isActive ? 'bg-grit-cyan/10 text-grit-cyan' : 'text-grit-text hover:bg-grit-cyan/5',
        gritFocusRing,
      )}
    >
      {leaf.icon && (
        <GritIcon name={leaf.icon} size={iconSize} className={isActive ? 'text-grit-cyan' : 'text-grit-subtext'} />
      )}
      <span className="truncate">{leaf.label}</span>
    </Link>
  );
}
