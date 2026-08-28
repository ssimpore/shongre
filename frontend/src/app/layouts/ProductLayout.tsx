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
import type { RoutePolicyId } from "../../security/access-policy.registry";
import type { ShongreProductId } from "../../types";

interface ProductLayoutProps {
  productId: ShongreProductId;
  productName: string;
  productPath: string;
  workspacePath: string;
  navigation: readonly ProductNavigationItem[];
  footerDescription?: string;
  workspacePolicyId?: RoutePolicyId;
}

export const ProductLayout: React.FC<ProductLayoutProps> = ({
  productId,
  productName,
  productPath,
  workspacePath,
  navigation,
  footerDescription,
  workspacePolicyId,
}) => {
  return (
    <div className="flex min-h-screen flex-col bg-bg-surface text-stone-900">
      <SkipLink />
      <AppScrollRestoration />
      <DemoRoleSwitcher utility={<AnalyticsRuntime />} />
      <ProductHeader
        productId={productId}
        productName={productName}
        productPath={productPath}
        workspacePath={workspacePath}
        navigation={navigation}
        workspacePolicyId={workspacePolicyId}
      />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <Outlet />
      </main>
      <ProductFooter
        productId={productId}
        productName={productName}
        productPath={productPath}
        navigation={navigation}
        description={footerDescription}
      />
      <PreferencesModal />
      <CookieConsent />
    </div>
  );
};
