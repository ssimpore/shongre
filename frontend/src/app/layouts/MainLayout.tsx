import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { MobileBottomNav } from './MobileBottomNav';
import { DemoRoleSwitcher } from './DemoRoleSwitcher';
import { LocationPickerModal } from './LocationPickerModal';
import { PreferencesModal } from './PreferencesModal';
import { AppScrollRestoration } from '../router/AppScrollRestoration';

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-bg-base text-stone-900">
      <AppScrollRestoration />
      <DemoRoleSwitcher />
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <Footer />
      <MobileBottomNav />
      <LocationPickerModal />
      <PreferencesModal />
    </div>
  );
};
