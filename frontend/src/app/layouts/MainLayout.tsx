import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { MobileBottomNav } from './MobileBottomNav';
import { DemoRoleSwitcher } from './DemoRoleSwitcher';
import { LocationPickerModal } from './LocationPickerModal';
import { PreferencesModal } from './PreferencesModal';
import { CookieConsent } from './CookieConsent';
import { AppScrollRestoration } from '../router/AppScrollRestoration';
import { SkipLink } from '../../design-system/primitives/SkipLink';

export const MainLayout: React.FC = () => {
  return (
    /* `--page-bottom-inset` is how a page declares that it pins something over
       the bottom of the viewport (the listing detail action bar is the only one
       today). Reserving it here rather than on `<main>` is deliberate: the
       footer is a sibling of `<main>`, so page-level padding cannot clear it —
       four footer legal links sat underneath the action bar at full scroll. */
    <div className="min-h-screen flex flex-col bg-bg-base text-stone-900 pb-[var(--page-bottom-inset,0px)]">
      <SkipLink />
      <AppScrollRestoration />
      <DemoRoleSwitcher />
      <Header />
      {/* Clearance for the fixed tab bar comes from the same token the bar
          is built from, so it tracks the bar (and the iOS home indicator,
          which the old flat 80px ignored) instead of guessing at it. */}
      <main id="main-content" tabIndex={-1} className="flex-1 pb-[var(--mobile-nav-total-h)] md:pb-0">
        <Outlet />
      </main>
      <Footer />
      <MobileBottomNav />
      <LocationPickerModal />
      <PreferencesModal />
      <CookieConsent />
    </div>
  );
};
