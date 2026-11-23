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
const SIZES: Record<PortalNavVariant, { overline: string; group: string; child: string }> = {
  sidebar: { overline: 'pb-1.5 pt-3', group: 'py-[11px]', child: 'py-[9px]' },
  drawer: { overline: 'py-3.5', group: 'py-3', child: 'py-3' },
};

/** v3 section label ("MI CUENTA", "ORGANIZACIÓN"). */
const overlineClass = 'px-3.5 font-grit-body text-[10px] font-semibold uppercase tracking-[1.3px] text-grit-muted';

/** v3 Nav Item / Activo and Sub Item / Activo (`cUHCL`, `LTtTI`): gradient pill + cyan stroke + glow (US-0141). */
const activePillClass =
  'border-grit-cyan/30 bg-gradient-to-r from-grit-cyan/[0.18] via-grit-cyan/[0.04] to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_24px_rgba(20,219,196,0.12)]';

/** Trailing "live" dot that marks the single active row. */
function LiveDot() {
  return (
    <span aria-hidden className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-grit-cyan shadow-[0_0_8px_rgba(20,219,196,0.8)]" />
  );
}

/**
 * Navigation body shared by PortalSidebar (desktop) and PortalMobileDrawer (mobile): Org Switcher,
 * "MI CUENTA" + the tenant "ORGANIZACIÓN" tree (v3 `Vl7zI` / `N3E8S`, US-0138, US-0141).
 */
export function PortalNavContent({ variant, nav, onNavigate }: PortalNavContentProps) {
  const { globalItems, activeHref, tenantNav, tenantLoading, activeGroupId } = nav;
  const sizes = SIZES[variant];
  const menuListId = useId();
  const [menuOpen, setMenuOpen] = useState(true);

  return (
    <nav aria-label="Menú del portal" className="flex flex-col gap-0.5 font-grit-body">
      {tenantNav ? (
        <OrgSwitcher tenantNav={tenantNav} onNavigate={onNavigate} />
      ) : (
        tenantLoading && <div aria-hidden className="mb-2 h-[54px] animate-pulse rounded-[18px] bg-white/[0.04]" />
      )}

      <button
        type="button"
        aria-expanded={menuOpen}
        aria-controls={menuListId}
        onClick={() => setMenuOpen((prev) => !prev)}
        className={cx(
          overlineClass,
          sizes.overline,
          'flex w-full items-center justify-between rounded-grit-xs text-left transition-colors hover:text-grit-subtext',
          gritFocusRing,
        )}
      >
        Mi cuenta
        <GritIcon name={menuOpen ? 'expand_less' : 'expand_more'} size={12} />
      </button>
      {menuOpen && (
        <ul id={menuListId} className="flex flex-col gap-1">
          {globalItems.map((item) => (
            <li key={item.href}>
              <TopNavLink
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={item.href === activeHref}
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
      )}

      {(tenantNav || tenantLoading) && (
        <>
          <GritDivider className="my-2" />
          <p className={cx(overlineClass, sizes.overline)}>Organización</p>
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
            <div aria-hidden className="h-[120px] animate-pulse rounded-grit-2xl bg-white/[0.03]" />
          )}
        </>
      )}
    </nav>
  );
}

type OrgSwitcherProps = {
  tenantNav: PortalTenantNav;
  onNavigate?: () => void;
};

/**
 * v3 Org Switcher (`weLbQ`): the active organization, linking to the organization list.
 * Shows the tenant initial instead of the logo — the menu never loads images (US-0138, US-0141).
 */
function OrgSwitcher({ tenantNav, onNavigate }: OrgSwitcherProps) {
  const { tenantName, tenantNameLoading } = tenantNav;
  const initial = tenantName?.trim().charAt(0).toUpperCase();

  return (
    <Link
      href="/portal/orgs"
      onClick={onNavigate}
      aria-label={tenantName ? `Cambiar de organización (actual: ${tenantName})` : 'Cambiar de organización'}
      className={cx(
        'mb-2 flex items-center gap-2.5 rounded-[18px] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors hover:border-white/20',
        gritFocusRing,
      )}
    >
      <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] border border-grit-cyan/50 bg-grit-bg text-grit-cyan shadow-[0_0_12px_rgba(20,219,196,0.2)]">
        {initial ? (
          // The org mark is the one deliberate Exo 2 bold-italic use in v3 (DESIGN.md §2)
          <span className="font-grit-title text-base font-[700] italic leading-none">{initial}</span>
        ) : (
          <GritIcon name="corporate_fare" size={16} />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        {tenantName ? (
          <span className="truncate text-[13px] font-semibold text-grit-text" title={tenantName}>
            {tenantName}
          </span>
        ) : (
          tenantNameLoading && <span aria-hidden className="mb-0.5 mt-1 h-2.5 w-24 animate-pulse rounded-full bg-white/10" />
        )}
        <span className="text-[10px] text-grit-muted">Organización</span>
      </span>
      <GritIcon name="unfold_more" size={15} className="text-grit-muted" />
    </Link>
  );
}

type OrgSectionProps = {
  variant: PortalNavVariant;
  tenantNav: PortalTenantNav;
  activeHref: string | null;
  activeGroupId: PortalNavGroupId | null;
  onNavigate?: () => void;
};

/** The ORGANIZACIÓN tree. Always expanded (v3 has no section collapse); groups keep their own toggles. */
function OrgSection({ variant, tenantNav, activeHref, activeGroupId, onNavigate }: OrgSectionProps) {
  // Groups start collapsed except the one holding the active link
  const [openGroups, setOpenGroups] = useState<Set<PortalNavGroupId>>(
    () => new Set(activeGroupId ? [activeGroupId] : []),
  );
  const [lastActiveGroupId, setLastActiveGroupId] = useState(activeGroupId);

  // Navigating into another group force-expands it; other groups keep their state
  if (activeGroupId !== lastActiveGroupId) {
    setLastActiveGroupId(activeGroupId);
    if (activeGroupId) {
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

  return (
    <ul className="flex flex-col gap-0.5">
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
            <TopNavLink
              href={node.href}
              icon={node.icon}
              label={node.label}
              isActive={node.href === activeHref}
              onNavigate={onNavigate}
            />
          </li>
        ),
      )}
    </ul>
  );
}

type TopNavLinkProps = {
  href: string;
  icon?: string;
  label: string;
  isActive: boolean;
  onNavigate?: () => void;
};

/** v3 Nav Item / Default and / Activo (`h135V`, `cUHCL`) — global items and top-level org leaves. */
function TopNavLink({ href, icon, label, isActive, onNavigate }: TopNavLinkProps) {
  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      onClick={onNavigate}
      className={cx(
        'flex items-center gap-3 rounded-full border text-sm transition-colors',
        isActive
          ? cx('py-[7px] pl-[7px] pr-3.5 font-semibold text-grit-text', activePillClass)
          : 'border-transparent px-3.5 py-3 text-grit-subtext hover:bg-white/[0.04] hover:text-grit-text',
        gritFocusRing,
      )}
    >
      {isActive ? (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-grit-cyan-light to-grit-cyan text-grit-on-brand shadow-[0_4px_14px_rgba(20,219,196,0.4),inset_0_1px_0_rgba(255,255,255,0.5)]">
          {icon && <GritIcon name={icon} size={16} />}
        </span>
      ) : (
        icon && <GritIcon name={icon} size={18} className="text-grit-muted" />
      )}
      <span className="truncate">{label}</span>
      {isActive && <LiveDot />}
    </Link>
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

/** v3 Nav Item / Grupo (`OYzP7`) with its Sub Items (`LTtTI` / `oZ0P6`). */
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
          'flex w-full items-center gap-3.5 rounded-full px-3.5 text-left text-[13px] transition-colors hover:bg-white/[0.04]',
          sizes.group,
          containsActive ? 'font-medium text-grit-text' : 'text-grit-subtext hover:text-grit-text',
          gritFocusRing,
        )}
      >
        <GritIcon name={group.icon} size={17} className={containsActive ? 'text-grit-cyan' : 'text-grit-muted'} />
        <span className="flex-1 truncate">{group.label}</span>
        <GritIcon name={open ? 'expand_more' : 'chevron_right'} size={14} className="text-grit-muted" />
      </button>

      {open && (
        <ul id={listId} className="flex flex-col gap-0.5 pb-1.5 pl-[22px] pt-0.5">
          {group.children.map((child) => (
            <li key={child.href}>
              <SubNavLink leaf={child} sizeClass={sizes.child} isActive={child.href === activeHref} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

type SubNavLinkProps = {
  leaf: ResolvedNavLeaf;
  sizeClass: string;
  isActive: boolean;
  onNavigate?: () => void;
};

function SubNavLink({ leaf, sizeClass, isActive, onNavigate }: SubNavLinkProps) {
  return (
    <Link
      href={leaf.href}
      aria-current={isActive ? 'page' : undefined}
      onClick={onNavigate}
      className={cx(
        'flex items-center gap-2.5 rounded-full border pl-4 pr-3 text-xs transition-colors',
        sizeClass,
        isActive
          ? cx('font-semibold text-grit-text', activePillClass)
          : 'border-transparent text-grit-subtext hover:bg-white/[0.04] hover:text-grit-text',
        gritFocusRing,
      )}
    >
      {leaf.icon && <GritIcon name={leaf.icon} size={15} className={isActive ? 'text-grit-cyan' : 'text-grit-muted'} />}
      <span className="truncate">{leaf.label}</span>
      {isActive && <LiveDot />}
    </Link>
  );
}
