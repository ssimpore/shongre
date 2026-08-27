import React from "react";
import { Outlet } from "react-router-dom";
import { SkipLink } from "../../design-system";
import { AnalyticsRuntime } from "../../analytics/AnalyticsRuntime";
import { AppScrollRestoration } from "../router/AppScrollRestoration";
import { CookieConsent } from "./CookieConsent";
import { DemoRoleSwitcher } from "./DemoRoleSwitcher";
import { PreferencesModal } from "./PreferencesModal";
import { ProductFooter } from "./ProductFooter";
import { ProductHeader, type ProductNavigationItem } from "./ProductHeader";

interface ProductLayoutProps {
  productName: string;
  productPath: string;
  workspacePath: string;
  navigation: readonly ProductNavigationItem[];
}

export const ProductLayout: React.FC<ProductLayoutProps> = ({
  productName,
  productPath,
  workspacePath,
  navigation,
}) => {
  return (
    <div className="flex min-h-screen flex-col bg-bg-surface text-stone-900">
      <SkipLink />
      <AppScrollRestoration />
      <DemoRoleSwitcher utility={<AnalyticsRuntime />} />
      <ProductHeader
        productName={productName}
        productPath={productPath}
        workspacePath={workspacePath}
        navigation={navigation}
      />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <Outlet />
      </main>
      <ProductFooter
        productName={productName}
        productPath={productPath}
        navigation={navigation}
      />
      <PreferencesModal />
      <CookieConsent />
    </div>
  );
};
