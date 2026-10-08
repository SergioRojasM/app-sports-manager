'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { BodyPortal, GritDivider, GritIcon, cx, gritFocusRing } from '@/components/ui';
import { PortalNavContent } from '@/components/portal/PortalNavContent';
import { PortalSidebarUser } from '@/components/portal/PortalSidebarUser';
import { usePortalNavigationContext } from '@/components/portal/PortalNavigationProvider';
import type { PortalDisplayProfile } from '@/types/portal.types';

export const PORTAL_MOBILE_DRAWER_ID = 'portal-mobile-drawer';

const DESKTOP_QUERY = '(min-width: 1024px)';
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

type PortalMobileDrawerProps = {
  open: boolean;
  onClose: () => void;
  profile: PortalDisplayProfile;
  /** The hamburger that opened the drawer; focus returns to it on close. */
  returnFocusRef: RefObject<HTMLButtonElement | null>;
};

/**
 * Right-side navigation drawer for viewports below 1024px, design AGzMs (US-0138).
 * Full dynamic-viewport height with its own scroll region so the menu never
 * overflows the screen; the page behind is scroll-locked while it is open.
 */
export function PortalMobileDrawer({ open, onClose, profile, returnFocusRef }: PortalMobileDrawerProps) {
  const nav = usePortalNavigationContext();
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastPathnameRef = useRef(pathname);
  const wasOpenRef = useRef(false);
  const [entered, setEntered] = useState(false);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);

  // Slide in on the frame after mounting/opening so the transition runs from translate-x-full
  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(open));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  // Focus the close button on open; give focus back to the hamburger on close
  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      closeButtonRef.current?.focus();
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      returnFocusRef.current?.focus();
    }
  }, [open, returnFocusRef]);

  // Any navigation (link tap, back/forward) closes the drawer
  useEffect(() => {
    if (lastPathnameRef.current !== pathname) {
      lastPathnameRef.current = pathname;
      onClose();
    }
  }, [pathname, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    // Lock the page behind: the portal scrolls inside <main>, not the body
    const main = document.getElementById('portal-main');
    const previousBody = document.body.style.overflow;
    const previousMain = main?.style.overflow ?? '';
    document.body.style.overflow = 'hidden';
    if (main) {
      main.style.overflow = 'hidden';
    }

    const desktop = window.matchMedia(DESKTOP_QUERY);
    const handleViewportChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        onClose();
      }
    };
    desktop.addEventListener('change', handleViewportChange);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) {
        return;
      }
      // Keep Tab / Shift+Tab cycling inside the panel
      const focusables = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) {
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement;
      if (event.shiftKey && (current === first || !panelRef.current.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousBody;
      if (main) {
        main.style.overflow = previousMain;
      }
      desktop.removeEventListener('change', handleViewportChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  // Bottom fade only while there is more menu below (scroll, group toggles, resize)
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!open || !scroller) {
      return;
    }
    const update = () => {
      setHasMoreBelow(scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight > 4);
    };
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    if (scroller.firstElementChild) {
      observer.observe(scroller.firstElementChild);
    }
    scroller.addEventListener('scroll', update, { passive: true });
    return () => {
      observer.disconnect();
      scroller.removeEventListener('scroll', update);
    };
  }, [open]);

  const visible = open && entered;

  return (
    <BodyPortal>
      <div
        className={cx(
          'fixed inset-0 z-[60] lg:hidden',
          // visibility flips after the slide-out so the panel stays animated, then leaves the a11y tree
          open ? 'visible' : 'pointer-events-none invisible transition-[visibility] duration-200',
        )}
        inert={!open}
      >
        <div
          aria-hidden
          onClick={onClose}
          className={cx(
            'absolute inset-0 bg-grit-bg/70 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none',
            visible ? 'opacity-100' : 'opacity-0',
          )}
        />

        <div
          ref={panelRef}
          id={PORTAL_MOBILE_DRAWER_ID}
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
          className={cx(
            'absolute right-0 top-0 flex h-dvh w-[336px] max-w-[86vw] flex-col gap-4 border-l border-grit-glass-border bg-grit-bg px-4 pb-5 pt-[18px] shadow-[-12px_0_40px_rgba(0,0,0,0.6)]',
            'transition-transform duration-200 ease-out motion-reduce:transition-none',
            visible ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          <div className="flex items-center justify-between pl-2">
            <Link href="/portal" onClick={onClose} className={cx('flex items-center rounded-grit-sm', gritFocusRing)}>
              <div className="relative h-8 w-32">
                <Image src="/logo-navbar.png" alt="GRIT Arena" fill className="object-contain object-left" />
              </div>
            </Link>
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Cerrar menú"
              onClick={onClose}
              className={cx(
                'flex h-[38px] w-[38px] items-center justify-center rounded-grit-md border border-grit-glass-border bg-grit-glass text-grit-text transition-colors hover:bg-grit-cyan/10',
                gritFocusRing,
              )}
            >
              <GritIcon name="close" size={18} />
            </button>
          </div>

          <div ref={scrollRef} className="grit-scrollbar -mr-2 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2">
            <PortalNavContent variant="drawer" nav={nav} onNavigate={onClose} />
            <div
              aria-hidden
              className={cx(
                'pointer-events-none sticky bottom-0 -mt-14 h-14 bg-gradient-to-t from-grit-bg to-transparent transition-opacity',
                hasMoreBelow ? 'opacity-100' : 'opacity-0',
              )}
            />
          </div>

          <GritDivider />
          <PortalSidebarUser profile={profile} tenantRole={nav.tenantNav?.role ?? null} onNavigate={onClose} />
        </div>
      </div>
    </BodyPortal>
  );
}
