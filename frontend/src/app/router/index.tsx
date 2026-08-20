import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { AccountLayout } from '../layouts/AccountLayout';
import { FocusedLayout } from '../layouts/FocusedLayout';
import { PageSuspense } from '../layouts/PageSuspense';

// Security & RBAC Guards
import { RequireAuth } from '../../security/components/RequireAuth';
import { RequirePermission } from '../../security/components/RequirePermission';
import { RequireRole } from '../../security/components/RequireRole';
import { AdminLayout } from '../../features/admin/AdminLayout';

// Lazy Loaded Features
const HomePage = lazy(() => import('../../features/home/HomePage').then((m) => ({ default: m.HomePage })));
const CategoriesPage = lazy(() => import('../../features/categories/CategoriesPage').then((m) => ({ default: m.CategoriesPage })));
const CollectionsPage = lazy(() => import('../../features/collections/CollectionsPage').then((m) => ({ default: m.CollectionsPage })));
const SearchPage = lazy(() => import('../../features/search/SearchPage').then((m) => ({ default: m.SearchPage })));
const ListingDetailPage = lazy(() => import('../../features/listings/ListingDetailPage').then((m) => ({ default: m.ListingDetailPage })));
const PublishWizard = lazy(() => import('../../features/publishing/PublishWizard').then((m) => ({ default: m.PublishWizard })));
const MessagingPage = lazy(() => import('../../features/messaging/MessagingPage').then((m) => ({ default: m.MessagingPage })));
const FavoritesPage = lazy(() => import('../../features/favorites/FavoritesPage').then((m) => ({ default: m.FavoritesPage })));
const SavedSearchesPage = lazy(() => import('../../features/saved-searches/SavedSearchesPage').then((m) => ({ default: m.SavedSearchesPage })));
const NotificationsPage = lazy(() => import('../../features/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const NotificationPreferencesPage = lazy(() => import('../../features/notifications/NotificationPreferencesPage').then((m) => ({ default: m.NotificationPreferencesPage })));
const TransactionsPage = lazy(() => import('../../features/transactions/TransactionsPage').then((m) => ({ default: m.TransactionsPage })));
const VerificationCenterPage = lazy(() => import('../../features/verification/VerificationCenterPage').then((m) => ({ default: m.VerificationCenterPage })));
const AccountOverviewPage = lazy(() => import('../../features/seller-workspace/AccountOverviewPage').then((m) => ({ default: m.AccountOverviewPage })));
const MyListingsPage = lazy(() => import('../../features/seller-workspace/MyListingsPage').then((m) => ({ default: m.MyListingsPage })));
const ProDashboardPage = lazy(() => import('../../features/seller-workspace/ProDashboardPage').then((m) => ({ default: m.ProDashboardPage })));
const ProStorefrontEditorPage = lazy(() => import('../../features/seller-workspace/ProStorefrontEditorPage').then((m) => ({ default: m.ProStorefrontEditorPage })));
const ProPlansPage = lazy(() => import('../../features/seller-workspace/ProPlansPage').then((m) => ({ default: m.ProPlansPage })));
const ProDirectoryPage = lazy(() => import('../../features/pro/ProDirectoryPage').then((m) => ({ default: m.ProDirectoryPage })));
const SellerPublicPage = lazy(() => import('../../features/profile/SellerPublicPage').then((m) => ({ default: m.SellerPublicPage })));
const LoginPage = lazy(() => import('../../features/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterChoicePage = lazy(() => import('../../features/auth/RegisterPages').then((m) => ({ default: m.RegisterChoicePage })));
const RegisterIndividualPage = lazy(() => import('../../features/auth/RegisterPages').then((m) => ({ default: m.RegisterIndividualPage })));
const RegisterProPage = lazy(() => import('../../features/auth/RegisterPages').then((m) => ({ default: m.RegisterProPage })));
const ForgotPasswordPage = lazy(() => import('../../features/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const VerifyEmailPage = lazy(() => import('../../features/auth/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })));

// Legal Pages
const TermsPage = lazy(() => import('../../features/legal/LegalPages').then((m) => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('../../features/legal/LegalPages').then((m) => ({ default: m.PrivacyPage })));
const LegalNoticesPage = lazy(() => import('../../features/legal/LegalPages').then((m) => ({ default: m.LegalNoticesPage })));
const AccessibilityPage = lazy(() => import('../../features/legal/LegalPages').then((m) => ({ default: m.AccessibilityPage })));
const HelpSafetyPage = lazy(() => import('../../features/legal/LegalPages').then((m) => ({ default: m.HelpSafetyPage })));
const DealsPage = lazy(() => import('../../features/legal/LegalPages').then((m) => ({ default: m.DealsPage })));
const HelpCenterPage = lazy(() => import('../../features/support/HelpCenterPage').then((m) => ({ default: m.HelpCenterPage })));
const ContactPage = lazy(() => import('../../features/support/ContactPage').then((m) => ({ default: m.ContactPage })));
const SupportRequestsPage = lazy(() => import('../../features/support/SupportRequestsPage').then((m) => ({ default: m.SupportRequestsPage })));
const SupportRequestDetailPage = lazy(() => import('../../features/support/SupportRequestDetailPage').then((m) => ({ default: m.SupportRequestDetailPage })));
const NewsletterLandingPage = lazy(() => import('../../features/newsletter/NewsletterLandingPage').then((m) => ({ default: m.NewsletterLandingPage })));
const NewsletterPreferencesPage = lazy(() => import('../../features/newsletter/NewsletterPreferencesPage').then((m) => ({ default: m.NewsletterPreferencesPage })));
const NewsletterConfirmPage = lazy(() => import('../../features/newsletter/NewsletterConfirmPage').then((m) => ({ default: m.NewsletterConfirmPage })));
const NewsletterUnsubscribePage = lazy(() => import('../../features/newsletter/NewsletterUnsubscribePage').then((m) => ({ default: m.NewsletterUnsubscribePage })));
const AdminNewsletterPage = lazy(() => import('../../features/admin/AdminNewsletterPage').then((m) => ({ default: m.AdminNewsletterPage })));
const NotFoundPage = lazy(() => import('../../features/errors/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

// Admin & Staff Workspace
const AdminOverviewPage = lazy(() => import('../../features/admin/AdminOverviewPage').then((m) => ({ default: m.AdminOverviewPage })));
const AdminModerationPage = lazy(() => import('../../features/admin/AdminModerationPage').then((m) => ({ default: m.AdminModerationPage })));
const AdminVerificationsPage = lazy(() => import('../../features/admin/AdminVerificationsPage').then((m) => ({ default: m.AdminVerificationsPage })));
const AdminUsersPage = lazy(() => import('../../features/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })));
const AdminRolesMatrixPage = lazy(() => import('../../features/admin/AdminRolesMatrixPage').then((m) => ({ default: m.AdminRolesMatrixPage })));
const AdminAuditLogsPage = lazy(() => import('../../features/admin/AdminAuditLogsPage').then((m) => ({ default: m.AdminAuditLogsPage })));
const AdminMarketsPage = lazy(() => import('../../features/admin/AdminMarketsPage').then((m) => ({ default: m.AdminMarketsPage })));
const AdminMonetizationPage = lazy(() => import('../../features/admin/AdminMonetizationPage').then((m) => ({ default: m.AdminMonetizationPage })));
const AdminTaxonomyPage = lazy(() => import('../../features/admin/AdminTaxonomyPage').then((m) => ({ default: m.AdminTaxonomyPage })));
const AdminProvidersPage = lazy(() => import('../../features/admin/providers/AdminProvidersPage').then((m) => ({ default: m.AdminProvidersPage })));
const AdminProviderDetailPage = lazy(() => import('../../features/admin/providers/AdminProviderDetailPage').then((m) => ({ default: m.AdminProviderDetailPage })));

// CRM Workspace
const CrmOverviewPage = lazy(() => import('../../features/admin/crm/CrmOverviewPage').then((m) => ({ default: m.CrmOverviewPage })));
const CrmContactsPage = lazy(() => import('../../features/admin/crm/CrmContactsPage').then((m) => ({ default: m.CrmContactsPage })));
const CrmContactDetailPage = lazy(() => import('../../features/admin/crm/CrmContactDetailPage').then((m) => ({ default: m.CrmContactDetailPage })));
const CrmCompaniesPage = lazy(() => import('../../features/admin/crm/CrmCompaniesPage').then((m) => ({ default: m.CrmCompaniesPage })));
const CrmCompanyDetailPage = lazy(() => import('../../features/admin/crm/CrmCompanyDetailPage').then((m) => ({ default: m.CrmCompanyDetailPage })));
const CrmPipelinePage = lazy(() => import('../../features/admin/crm/CrmPipelinePage').then((m) => ({ default: m.CrmPipelinePage })));
const CrmAiProspectingPage = lazy(() => import('../../features/admin/crm/CrmAiProspectingPage').then((m) => ({ default: m.CrmAiProspectingPage })));
const CrmTasksPage = lazy(() => import('../../features/admin/crm/CrmTasksPage').then((m) => ({ default: m.CrmTasksPage })));

const withSuspense = (Component: React.ComponentType) => (
  <Suspense fallback={<PageSuspense />}>
    <Component />
  </Suspense>
);

export const router = createBrowserRouter([
  // Task-completion flows get a focused shell rather than the marketplace one.
  {
    path: '/',
    element: <FocusedLayout />,
    children: [
      {
        path: 'deposer',
        element: (
          <RequirePermission permission="listing.create">
            {withSuspense(PublishWizard)}
          </RequirePermission>
        ),
      },

      // Signing in and signing up are task-completion flows too: the full
      // marketplace shell around a login form offers a dozen ways to wander off
      // mid-task, and the footer's category and city links are noise to someone
      // who is three fields from being done.
      { path: 'connexion', element: withSuspense(LoginPage) },
      { path: 'inscription', element: withSuspense(RegisterChoicePage) },
      { path: 'inscription/particulier', element: withSuspense(RegisterIndividualPage) },
      { path: 'inscription/professionnel', element: withSuspense(RegisterProPage) },
      { path: 'mot-de-passe-oublie', element: withSuspense(ForgotPasswordPage) },
      { path: 'reinitialisation-mot-de-passe', element: withSuspense(ForgotPasswordPage) },
      { path: 'verification-email', element: withSuspense(VerifyEmailPage) },
    ],
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: withSuspense(HomePage) },
      { path: 'categories', element: withSuspense(CategoriesPage) },
      { path: 'collections', element: withSuspense(CollectionsPage) },
      { path: 'collections/:slug', element: withSuspense(CollectionsPage) },
      { path: 'recherche', element: withSuspense(SearchPage) },
      { path: 'categorie/:categorySlug', element: withSuspense(SearchPage) },
      { path: 'annonce/:id', element: withSuspense(ListingDetailPage) },
      {
        path: 'publier',
        element: <Navigate to="/deposer" replace />,
      },
      { path: 'profil/:slug', element: withSuspense(SellerPublicPage) },
      { path: 'u/:slug', element: withSuspense(SellerPublicPage) },
      { path: 'vendeur/:slug', element: withSuspense(SellerPublicPage) },
      { path: 'boutique/:slug', element: withSuspense(SellerPublicPage) },
      { path: 'professionnels', element: withSuspense(ProDirectoryPage) },
      { path: 'solutions-pro', element: withSuspense(ProPlansPage) },
      { path: 'tarifs', element: withSuspense(ProPlansPage) },
      { path: 'bons-plans', element: withSuspense(DealsPage) },
      {
        path: 'messages',
        element: (
          <RequirePermission permission="message.read.own">
            {withSuspense(MessagingPage)}
          </RequirePermission>
        ),
      },

      // Legal & Info
      { path: 'conditions-utilisation', element: withSuspense(TermsPage) },
      { path: 'confidentialite', element: withSuspense(PrivacyPage) },
      { path: 'cookies', element: withSuspense(PrivacyPage) },
      { path: 'mentions-legales', element: withSuspense(LegalNoticesPage) },
      { path: 'accessibilite', element: withSuspense(AccessibilityPage) },
      { path: 'aide', element: withSuspense(HelpCenterPage) },
      { path: 'securite', element: withSuspense(HelpSafetyPage) },
      { path: 'contact', element: withSuspense(ContactPage) },
      { path: 'newsletter', element: withSuspense(NewsletterLandingPage) },
      { path: 'newsletter/confirmer', element: withSuspense(NewsletterConfirmPage) },
      { path: 'newsletter/desabonnement', element: withSuspense(NewsletterUnsubscribePage) },

      // Account & Workspaces (Guarded by RequireAuth)
      {
        path: 'compte',
        element: (
          <RequireAuth>
            <AccountLayout />
          </RequireAuth>
        ),
        children: [
          { index: true, element: withSuspense(AccountOverviewPage) },
          { path: 'annonces', element: withSuspense(MyListingsPage) },
          { path: 'favoris', element: withSuspense(FavoritesPage) },
          { path: 'recherches', element: withSuspense(SavedSearchesPage) },
          { path: 'messages', element: withSuspense(MessagingPage) },
          { path: 'notifications', element: withSuspense(NotificationsPage) },
          { path: 'notifications/preferences', element: withSuspense(NotificationPreferencesPage) },
          { path: 'achats', element: withSuspense(TransactionsPage) },
          { path: 'verification', element: withSuspense(VerificationCenterPage) },
          { path: 'support', element: withSuspense(SupportRequestsPage) },
          { path: 'support/:id', element: withSuspense(SupportRequestDetailPage) },
          { path: 'newsletter', element: withSuspense(NewsletterPreferencesPage) },
          { path: 'profil', element: withSuspense(AccountOverviewPage) },

          // Pro sub-routes
          {
            path: 'pro/tableau-de-bord',
            element: (
              <RequireRole roles={['pro_seller', 'admin', 'super_admin']}>
                {withSuspense(ProDashboardPage)}
              </RequireRole>
            ),
          },
          {
            path: 'pro/vitrine',
            element: (
              <RequirePermission permission="store.customization.manage">
                {withSuspense(ProStorefrontEditorPage)}
              </RequirePermission>
            ),
          },
          { path: 'pro/abonnements', element: withSuspense(ProPlansPage) },
        ],
      },

      // 404
      { path: '*', element: withSuspense(NotFoundPage) },
    ],
  },

  // Internal Staff & Admin Routes (Partitioned Layout)
  {
    path: '/admin',
    element: (
      <RequireRole
        roles={[
          'moderator',
          'support',
          'operations',
          'finance',
          'commercial',
          'content_manager',
          'market_manager',
          'admin',
          'super_admin',
        ]}
      >
        <AdminLayout />
      </RequireRole>
    ),
    children: [
      { index: true, element: withSuspense(AdminOverviewPage) },
      {
        path: 'moderation',
        element: (
          <RequirePermission permission="moderation.review">
            {withSuspense(AdminModerationPage)}
          </RequirePermission>
        ),
      },
      {
        path: 'utilisateurs',
        element: (
          <RequirePermission permission="user.read">
            {withSuspense(AdminUsersPage)}
          </RequirePermission>
        ),
      },
      {
        path: 'verifications',
        element: (
          <RequirePermission permission="user.read">
            {withSuspense(AdminVerificationsPage)}
          </RequirePermission>
        ),
      },
      {
        path: 'marches',
        element: (
          <RequirePermission permission="market.manage">
            {withSuspense(AdminMarketsPage)}
          </RequirePermission>
        ),
      },
      {
        path: 'fournisseurs',
        element: (
          <RequirePermission permission="provider.read">
            {withSuspense(AdminProvidersPage)}
          </RequirePermission>
        ),
      },
      {
        path: 'fournisseurs/:providerId',
        element: (
          <RequirePermission permission="provider.read">
            {withSuspense(AdminProviderDetailPage)}
          </RequirePermission>
        ),
      },
      {
        path: 'taxonomie',
        element: (
          <RequirePermission permission="taxonomy.manage">
            {withSuspense(AdminTaxonomyPage)}
          </RequirePermission>
        ),
      },
      {
        path: 'taxonomy',
        element: (
          <RequirePermission permission="taxonomy.manage">
            {withSuspense(AdminTaxonomyPage)}
          </RequirePermission>
        ),
      },
      {
        path: 'monetisation',
        element: (
          <RequirePermission permission="monetization.manage">
            {withSuspense(AdminMonetizationPage)}
          </RequirePermission>
        ),
      },
      {
        path: 'roles',
        element: withSuspense(AdminRolesMatrixPage),
      },
      {
        path: 'audit',
        element: (
          <RequirePermission permission="audit.read">
            {withSuspense(AdminAuditLogsPage)}
          </RequirePermission>
        ),
      },
      {
        path: 'newsletter',
        element: (
          <RequirePermission permission="market.manage">
            {withSuspense(AdminNewsletterPage)}
          </RequirePermission>
        ),
      },
      // CRM & AI Prospecting
      {
        path: 'crm',
        element: (
          <RequirePermission permission="crm.access">
            {withSuspense(CrmOverviewPage)}
          </RequirePermission>
        ),
      },
      {
        path: 'crm/contacts',
        element: (
          <RequirePermission permission="crm.contact.read">
            {withSuspense(CrmContactsPage)}
          </RequirePermission>
        ),
      },
      {
        path: 'crm/contacts/:id',
        element: (
          <RequirePermission permission="crm.contact.read">
            {withSuspense(CrmContactDetailPage)}
          </RequirePermission>
        ),
      },
      {
        path: 'crm/entreprises',
        element: (
          <RequirePermission permission="crm.company.read">
            {withSuspense(CrmCompaniesPage)}
          </RequirePermission>
        ),
      },
      {
        path: 'crm/entreprises/:id',
        element: (
          <RequirePermission permission="crm.company.read">
            {withSuspense(CrmCompanyDetailPage)}
          </RequirePermission>
        ),
      },
      {
        path: 'crm/pipeline',
        element: (
          <RequirePermission permission="crm.opportunity.read">
            {withSuspense(CrmPipelinePage)}
          </RequirePermission>
        ),
      },
      {
        path: 'crm/prospection',
        element: (
          <RequirePermission permission="crm.ai_prospecting.use">
            {withSuspense(CrmAiProspectingPage)}
          </RequirePermission>
        ),
      },
      {
        path: 'crm/taches',
        element: (
          <RequirePermission permission="crm.access">
            {withSuspense(CrmTasksPage)}
          </RequirePermission>
        ),
      },
    ],
  },
]);

export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};
