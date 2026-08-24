import React, { Suspense, lazy } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  useLocation,
} from "react-router-dom";
import { MainLayout } from "../layouts/MainLayout";
import { AccountLayout } from "../layouts/AccountLayout";
import { FocusedLayout } from "../layouts/FocusedLayout";
import { PageSuspense } from "../layouts/PageSuspense";

// Security & RBAC Guards
import { GuestOnlyRoute } from "../../security/components/GuestOnlyRoute";
import { RequireRoutePolicy } from "../../security/components/RequireRoutePolicy";
import { AdminLayout } from "../../features/admin/AdminLayout";

// Lazy Loaded Features
const HomePage = lazy(() =>
  import("../../features/home/HomePage").then((m) => ({ default: m.HomePage })),
);
const CategoriesPage = lazy(() =>
  import("../../features/categories/CategoriesPage").then((m) => ({
    default: m.CategoriesPage,
  })),
);
const CollectionsPage = lazy(() =>
  import("../../features/collections/CollectionsPage").then((m) => ({
    default: m.CollectionsPage,
  })),
);
const SearchPage = lazy(() =>
  import("../../features/search/SearchPage").then((m) => ({
    default: m.SearchPage,
  })),
);
const ListingDetailPage = lazy(() =>
  import("../../features/listings/ListingDetailPage").then((m) => ({
    default: m.ListingDetailPage,
  })),
);
const PublishWizard = lazy(() =>
  import("../../features/publishing/PublishWizard").then((m) => ({
    default: m.PublishWizard,
  })),
);
const CoursesSearchPage = lazy(() =>
  import("../../features/courses/CoursesSearchPage").then((m) => ({
    default: m.CoursesSearchPage,
  })),
);
const CourseTutorProfilePage = lazy(() =>
  import("../../features/courses/CourseTutorProfilePage").then((m) => ({
    default: m.CourseTutorProfilePage,
  })),
);
const CourseLearnerRequestPage = lazy(() =>
  import("../../features/courses/CourseLearnerRequestPage").then((m) => ({
    default: m.CourseLearnerRequestPage,
  })),
);
const CourseTutorOnboardingPage = lazy(() =>
  import("../../features/courses/CourseTutorOnboardingPage").then((m) => ({
    default: m.CourseTutorOnboardingPage,
  })),
);
const CourseTutorWorkspacePage = lazy(() =>
  import("../../features/courses/CourseTutorWorkspacePage").then((m) => ({
    default: m.CourseTutorWorkspacePage,
  })),
);
const CourseOrganizationWorkspacePage = lazy(() =>
  import("../../features/courses/CourseOrganizationWorkspacePage").then(
    (m) => ({
      default: m.CourseOrganizationWorkspacePage,
    }),
  ),
);
const AutoSearchPage = lazy(() =>
  import("../../features/auto/AutoSearchPage").then((m) => ({
    default: m.AutoSearchPage,
  })),
);
const AutoVehicleDetailPage = lazy(() =>
  import("../../features/auto/AutoVehicleDetailPage").then((m) => ({
    default: m.AutoVehicleDetailPage,
  })),
);
const AutoComparePage = lazy(() =>
  import("../../features/auto/AutoComparePage").then((m) => ({
    default: m.AutoComparePage,
  })),
);
const AutoPublishWizardPage = lazy(() =>
  import("../../features/auto/AutoPublishWizardPage").then((m) => ({
    default: m.AutoPublishWizardPage,
  })),
);
const AutoDealerWorkspacePage = lazy(() =>
  import("../../features/auto/AutoDealerWorkspacePage").then((m) => ({
    default: m.AutoDealerWorkspacePage,
  })),
);
const ImmoSearchPage = lazy(() =>
  import("../../features/real-estate/ImmoSearchPage").then((m) => ({
    default: m.ImmoSearchPage,
  })),
);
const ImmoPropertyDetailPage = lazy(() =>
  import("../../features/real-estate/ImmoPropertyDetailPage").then((m) => ({
    default: m.ImmoPropertyDetailPage,
  })),
);
const ImmoPublishWizardPage = lazy(() =>
  import("../../features/real-estate/ImmoPublishWizardPage").then((m) => ({
    default: m.ImmoPublishWizardPage,
  })),
);
const ImmoAgencyWorkspacePage = lazy(() =>
  import("../../features/real-estate/ImmoAgencyWorkspacePage").then((m) => ({
    default: m.ImmoAgencyWorkspacePage,
  })),
);
const EmploymentSearchPage = lazy(() =>
  import("../../features/employment/EmploymentSearchPage").then((m) => ({
    default: m.EmploymentSearchPage,
  })),
);
const EmploymentJobDetailPage = lazy(() =>
  import("../../features/employment/EmploymentJobDetailPage").then((m) => ({
    default: m.EmploymentJobDetailPage,
  })),
);
const EmploymentApplyPage = lazy(() =>
  import("../../features/employment/EmploymentApplyPage").then((m) => ({
    default: m.EmploymentApplyPage,
  })),
);
const EmploymentPublishWizardPage = lazy(() =>
  import("../../features/employment/EmploymentPublishWizardPage").then((m) => ({
    default: m.EmploymentPublishWizardPage,
  })),
);
const EmploymentCandidateWorkspacePage = lazy(() =>
  import("../../features/employment/EmploymentCandidateWorkspacePage").then(
    (m) => ({
      default: m.EmploymentCandidateWorkspacePage,
    }),
  ),
);
const EmploymentRecruiterWorkspacePage = lazy(() =>
  import("../../features/employment/EmploymentRecruiterWorkspacePage").then(
    (m) => ({
      default: m.EmploymentRecruiterWorkspacePage,
    }),
  ),
);
const MessagingPage = lazy(() =>
  import("../../features/messaging/MessagingPage").then((m) => ({
    default: m.MessagingPage,
  })),
);
const FavoritesPage = lazy(() =>
  import("../../features/favorites/FavoritesPage").then((m) => ({
    default: m.FavoritesPage,
  })),
);
const SavedSearchesPage = lazy(() =>
  import("../../features/saved-searches/SavedSearchesPage").then((m) => ({
    default: m.SavedSearchesPage,
  })),
);
const NotificationsPage = lazy(() =>
  import("../../features/notifications/NotificationsPage").then((m) => ({
    default: m.NotificationsPage,
  })),
);
const NotificationPreferencesPage = lazy(() =>
  import("../../features/notifications/NotificationPreferencesPage").then(
    (m) => ({ default: m.NotificationPreferencesPage }),
  ),
);
const TransactionsPage = lazy(() =>
  import("../../features/transactions/TransactionsPage").then((m) => ({
    default: m.TransactionsPage,
  })),
);
const AccountFinancePage = lazy(() =>
  import("../../features/account/AccountFinancePage").then((m) => ({
    default: m.AccountFinancePage,
  })),
);
const VerificationCenterPage = lazy(() =>
  import("../../features/verification/VerificationCenterPage").then((m) => ({
    default: m.VerificationCenterPage,
  })),
);
const AccountOverviewPage = lazy(() =>
  import("../../features/seller-workspace/AccountOverviewPage").then((m) => ({
    default: m.AccountOverviewPage,
  })),
);
const MyListingsPage = lazy(() =>
  import("../../features/seller-workspace/MyListingsPage").then((m) => ({
    default: m.MyListingsPage,
  })),
);
const ProDashboardPage = lazy(() =>
  import("../../features/seller-workspace/ProDashboardPage").then((m) => ({
    default: m.ProDashboardPage,
  })),
);
const ProStorefrontEditorPage = lazy(() =>
  import("../../features/seller-workspace/ProStorefrontEditorPage").then(
    (m) => ({ default: m.ProStorefrontEditorPage }),
  ),
);
const ProPlansPage = lazy(() =>
  import("../../features/seller-workspace/ProPlansPage").then((m) => ({
    default: m.ProPlansPage,
  })),
);
const ProDirectoryPage = lazy(() =>
  import("../../features/pro/ProDirectoryPage").then((m) => ({
    default: m.ProDirectoryPage,
  })),
);
const SellerPublicPage = lazy(() =>
  import("../../features/profile/SellerPublicPage").then((m) => ({
    default: m.SellerPublicPage,
  })),
);
const LoginPage = lazy(() =>
  import("../../features/auth/LoginPage").then((m) => ({
    default: m.LoginPage,
  })),
);
const RegisterChoicePage = lazy(() =>
  import("../../features/auth/RegisterPages").then((m) => ({
    default: m.RegisterChoicePage,
  })),
);
const RegisterIndividualPage = lazy(() =>
  import("../../features/auth/RegisterPages").then((m) => ({
    default: m.RegisterIndividualPage,
  })),
);
const RegisterProPage = lazy(() =>
  import("../../features/auth/RegisterPages").then((m) => ({
    default: m.RegisterProPage,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import("../../features/auth/ForgotPasswordPage").then((m) => ({
    default: m.ForgotPasswordPage,
  })),
);
const VerifyEmailPage = lazy(() =>
  import("../../features/auth/VerifyEmailPage").then((m) => ({
    default: m.VerifyEmailPage,
  })),
);
const OAuthCallbackPage = lazy(() =>
  import("../../features/auth/OAuthCallbackPage").then((m) => ({
    default: m.OAuthCallbackPage,
  })),
);
const AccountSecurityPage = lazy(() =>
  import("../../features/auth/AccountSecurityPage").then((m) => ({
    default: m.AccountSecurityPage,
  })),
);
const AccountTypeOnboardingPage = lazy(() =>
  import("../../features/auth/AccountTypeOnboardingPage").then((m) => ({
    default: m.AccountTypeOnboardingPage,
  })),
);

// Legal Pages
const TermsPage = lazy(() =>
  import("../../features/legal/LegalPages").then((m) => ({
    default: m.TermsPage,
  })),
);
const PrivacyPage = lazy(() =>
  import("../../features/legal/LegalPages").then((m) => ({
    default: m.PrivacyPage,
  })),
);
const LegalNoticesPage = lazy(() =>
  import("../../features/legal/LegalPages").then((m) => ({
    default: m.LegalNoticesPage,
  })),
);
const AccessibilityPage = lazy(() =>
  import("../../features/legal/LegalPages").then((m) => ({
    default: m.AccessibilityPage,
  })),
);
const HelpSafetyPage = lazy(() =>
  import("../../features/legal/LegalPages").then((m) => ({
    default: m.HelpSafetyPage,
  })),
);
const DealsPage = lazy(() =>
  import("../../features/legal/LegalPages").then((m) => ({
    default: m.DealsPage,
  })),
);
const AccountDeletionPage = lazy(
  () => import("../../features/legal/AccountDeletionPage"),
);
const HelpCenterPage = lazy(() =>
  import("../../features/support/HelpCenterPage").then((m) => ({
    default: m.HelpCenterPage,
  })),
);
const ContactPage = lazy(() =>
  import("../../features/support/ContactPage").then((m) => ({
    default: m.ContactPage,
  })),
);
const SupportRequestsPage = lazy(() =>
  import("../../features/support/SupportRequestsPage").then((m) => ({
    default: m.SupportRequestsPage,
  })),
);
const SupportRequestDetailPage = lazy(() =>
  import("../../features/support/SupportRequestDetailPage").then((m) => ({
    default: m.SupportRequestDetailPage,
  })),
);
const NewsletterLandingPage = lazy(() =>
  import("../../features/newsletter/NewsletterLandingPage").then((m) => ({
    default: m.NewsletterLandingPage,
  })),
);
const NewsletterPreferencesPage = lazy(() =>
  import("../../features/newsletter/NewsletterPreferencesPage").then((m) => ({
    default: m.NewsletterPreferencesPage,
  })),
);
const NewsletterConfirmPage = lazy(() =>
  import("../../features/newsletter/NewsletterConfirmPage").then((m) => ({
    default: m.NewsletterConfirmPage,
  })),
);
const NewsletterUnsubscribePage = lazy(() =>
  import("../../features/newsletter/NewsletterUnsubscribePage").then((m) => ({
    default: m.NewsletterUnsubscribePage,
  })),
);
const AdminNewsletterPage = lazy(() =>
  import("../../features/admin/AdminNewsletterPage").then((m) => ({
    default: m.AdminNewsletterPage,
  })),
);
const AdminCoursesPage = lazy(() =>
  import("../../features/courses/AdminCoursesPage").then((m) => ({
    default: m.AdminCoursesPage,
  })),
);
const AdminAutoPage = lazy(() =>
  import("../../features/auto/AdminAutoPage").then((m) => ({
    default: m.AdminAutoPage,
  })),
);
const AdminImmoPage = lazy(() =>
  import("../../features/real-estate/AdminImmoPage").then((m) => ({
    default: m.AdminImmoPage,
  })),
);
const NotFoundPage = lazy(() =>
  import("../../features/errors/NotFoundPage").then((m) => ({
    default: m.NotFoundPage,
  })),
);

// Admin & Staff Workspace
const AdminOverviewPage = lazy(() =>
  import("../../features/admin/AdminOverviewPage").then((m) => ({
    default: m.AdminOverviewPage,
  })),
);
const AdminModerationPage = lazy(() =>
  import("../../features/admin/AdminModerationPage").then((m) => ({
    default: m.AdminModerationPage,
  })),
);
const AdminVerificationsPage = lazy(() =>
  import("../../features/admin/AdminVerificationsPage").then((m) => ({
    default: m.AdminVerificationsPage,
  })),
);
const AdminUsersPage = lazy(() =>
  import("../../features/admin/AdminUsersPage").then((m) => ({
    default: m.AdminUsersPage,
  })),
);
const AdminRolesMatrixPage = lazy(() =>
  import("../../features/admin/AdminRolesMatrixPage").then((m) => ({
    default: m.AdminRolesMatrixPage,
  })),
);
const AdminAuditLogsPage = lazy(() =>
  import("../../features/admin/AdminAuditLogsPage").then((m) => ({
    default: m.AdminAuditLogsPage,
  })),
);
const AdminMarketsPage = lazy(() =>
  import("../../features/admin/AdminMarketsPage").then((m) => ({
    default: m.AdminMarketsPage,
  })),
);
const AdminMonetizationPage = lazy(() =>
  import("../../features/admin/AdminMonetizationPage").then((m) => ({
    default: m.AdminMonetizationPage,
  })),
);
const AdminFinancePage = lazy(() =>
  import("../../features/admin/AdminFinancePage").then((m) => ({
    default: m.AdminFinancePage,
  })),
);
const AdminTrendingPage = lazy(() =>
  import("../../features/admin/AdminTrendingPage").then((m) => ({
    default: m.AdminTrendingPage,
  })),
);
const AdminTaxonomyPage = lazy(() =>
  import("../../features/admin/AdminTaxonomyPage").then((m) => ({
    default: m.AdminTaxonomyPage,
  })),
);
const AdminProvidersPage = lazy(() =>
  import("../../features/admin/providers/AdminProvidersPage").then((m) => ({
    default: m.AdminProvidersPage,
  })),
);
const AdminProviderDetailPage = lazy(() =>
  import("../../features/admin/providers/AdminProviderDetailPage").then(
    (m) => ({ default: m.AdminProviderDetailPage }),
  ),
);

// CRM Workspace
const CrmOverviewPage = lazy(() =>
  import("../../features/admin/crm/CrmOverviewPage").then((m) => ({
    default: m.CrmOverviewPage,
  })),
);
const CrmContactsPage = lazy(() =>
  import("../../features/admin/crm/CrmContactsPage").then((m) => ({
    default: m.CrmContactsPage,
  })),
);
const CrmContactDetailPage = lazy(() =>
  import("../../features/admin/crm/CrmContactDetailPage").then((m) => ({
    default: m.CrmContactDetailPage,
  })),
);
const CrmCompaniesPage = lazy(() =>
  import("../../features/admin/crm/CrmCompaniesPage").then((m) => ({
    default: m.CrmCompaniesPage,
  })),
);
const CrmCompanyDetailPage = lazy(() =>
  import("../../features/admin/crm/CrmCompanyDetailPage").then((m) => ({
    default: m.CrmCompanyDetailPage,
  })),
);
const CrmPipelinePage = lazy(() =>
  import("../../features/admin/crm/CrmPipelinePage").then((m) => ({
    default: m.CrmPipelinePage,
  })),
);
const CrmAiProspectingPage = lazy(() =>
  import("../../features/admin/crm/CrmAiProspectingPage").then((m) => ({
    default: m.CrmAiProspectingPage,
  })),
);
const CrmTasksPage = lazy(() =>
  import("../../features/admin/crm/CrmTasksPage").then((m) => ({
    default: m.CrmTasksPage,
  })),
);
const EmploymentAdminPage = lazy(() =>
  import("../../features/admin/EmploymentAdminPage").then((m) => ({
    default: m.EmploymentAdminPage,
  })),
);

const withSuspense = (Component: React.ComponentType) => (
  <Suspense fallback={<PageSuspense />}>
    <Component />
  </Suspense>
);
const OrganizationFinancePage: React.FC = () => (
  <AccountFinancePage scope="organization" />
);

/** Client-side fallback for old deep links; Next serves the permanent redirects. */
const LegacyEducationRedirect: React.FC = () => {
  const location = useLocation();
  const pathname = location.pathname
    .replace(/^\/cours(?=\/|$)/, "/education")
    .replace(/^\/deposer\/cours(?=\/|$)/, "/deposer/education")
    .replace(/^\/compte\/cours(?=\/|$)/, "/compte/education")
    .replace(/^\/admin\/cours(?=\/|$)/, "/admin/education");
  return (
    <Navigate to={`${pathname}${location.search}${location.hash}`} replace />
  );
};

export const router = createBrowserRouter([
  // Task-completion flows get a focused shell rather than the marketplace one.
  {
    path: "/",
    element: <FocusedLayout />,
    children: [
      {
        path: "deposer",
        element: (
          <RequireRoutePolicy policyId="publishListing">
            {withSuspense(PublishWizard)}
          </RequireRoutePolicy>
        ),
      },
      {
        path: "deposer/education",
        element: (
          <RequireRoutePolicy policyId="publishCourse">
            {withSuspense(CourseTutorOnboardingPage)}
          </RequireRoutePolicy>
        ),
      },
      { path: "deposer/cours", element: <LegacyEducationRedirect /> },
      {
        path: "deposer/auto",
        element: (
          <RequireRoutePolicy policyId="publishAuto">
            {withSuspense(AutoPublishWizardPage)}
          </RequireRoutePolicy>
        ),
      },
      {
        path: "deposer/immo",
        element: (
          <RequireRoutePolicy policyId="publishRealEstate">
            {withSuspense(ImmoPublishWizardPage)}
          </RequireRoutePolicy>
        ),
      },
      {
        path: "deposer/emploi",
        element: (
          <RequireRoutePolicy policyId="publishEmployment">
            {withSuspense(EmploymentPublishWizardPage)}
          </RequireRoutePolicy>
        ),
      },

      // Signing in and signing up are task-completion flows too: the full
      // marketplace shell around a login form offers a dozen ways to wander off
      // mid-task, and the footer's category and city links are noise to someone
      // who is three fields from being done.
      {
        path: "connexion",
        element: <GuestOnlyRoute>{withSuspense(LoginPage)}</GuestOnlyRoute>,
      },
      {
        path: "inscription",
        element: (
          <GuestOnlyRoute>{withSuspense(RegisterChoicePage)}</GuestOnlyRoute>
        ),
      },
      {
        path: "inscription/particulier",
        element: (
          <GuestOnlyRoute>
            {withSuspense(RegisterIndividualPage)}
          </GuestOnlyRoute>
        ),
      },
      {
        path: "inscription/professionnel",
        element: (
          <GuestOnlyRoute>{withSuspense(RegisterProPage)}</GuestOnlyRoute>
        ),
      },
      {
        path: "mot-de-passe-oublie",
        element: withSuspense(ForgotPasswordPage),
      },
      {
        path: "reinitialisation-mot-de-passe",
        element: withSuspense(ForgotPasswordPage),
      },
      { path: "verification-email", element: withSuspense(VerifyEmailPage) },
      { path: "auth/callback", element: withSuspense(OAuthCallbackPage) },
    ],
  },
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: withSuspense(HomePage) },
      { path: "categories", element: withSuspense(CategoriesPage) },
      { path: "collections", element: withSuspense(CollectionsPage) },
      { path: "collections/:slug", element: withSuspense(CollectionsPage) },
      { path: "recherche", element: withSuspense(SearchPage) },
      { path: "categorie/:categorySlug", element: withSuspense(SearchPage) },
      { path: "annonce/:id", element: withSuspense(ListingDetailPage) },
      { path: "auto", element: withSuspense(AutoSearchPage) },
      {
        path: "auto/vehicule/:slug",
        element: withSuspense(AutoVehicleDetailPage),
      },
      { path: "auto/comparer", element: withSuspense(AutoComparePage) },
      { path: "immo", element: withSuspense(ImmoSearchPage) },
      {
        path: "immo/bien/:slug",
        element: withSuspense(ImmoPropertyDetailPage),
      },
      { path: "emploi", element: withSuspense(EmploymentSearchPage) },
      {
        path: "emploi/metier/:professionSlug",
        element: withSuspense(EmploymentSearchPage),
      },
      {
        path: "emploi/secteur/:sectorSlug",
        element: withSuspense(EmploymentSearchPage),
      },
      {
        path: "emploi/lieu/:locationSlug",
        element: withSuspense(EmploymentSearchPage),
      },
      {
        path: "emploi/offre/:slug",
        element: withSuspense(EmploymentJobDetailPage),
      },
      {
        path: "emploi/offre/:slug/postuler",
        element: (
          <RequireRoutePolicy policyId="applyEmployment">
            {withSuspense(EmploymentApplyPage)}
          </RequireRoutePolicy>
        ),
      },
      { path: "education", element: withSuspense(CoursesSearchPage) },
      {
        path: "education/professeur/:slug",
        element: withSuspense(CourseTutorProfilePage),
      },
      {
        path: "education/demande",
        element: (
          <RequireRoutePolicy policyId="requestCourse">
            {withSuspense(CourseLearnerRequestPage)}
          </RequireRoutePolicy>
        ),
      },
      { path: "cours/*", element: <LegacyEducationRedirect /> },
      { path: "cours", element: <LegacyEducationRedirect /> },
      {
        path: "publier",
        element: <Navigate to="/deposer" replace />,
      },
      { path: "profil/:slug", element: withSuspense(SellerPublicPage) },
      { path: "u/:slug", element: withSuspense(SellerPublicPage) },
      { path: "vendeur/:slug", element: withSuspense(SellerPublicPage) },
      { path: "boutique/:slug", element: withSuspense(SellerPublicPage) },
      { path: "professionnels", element: withSuspense(ProDirectoryPage) },
      { path: "solutions-pro", element: withSuspense(ProPlansPage) },
      { path: "tarifs", element: withSuspense(ProPlansPage) },
      { path: "bons-plans", element: withSuspense(DealsPage) },
      {
        path: "messages",
        element: (
          <RequireRoutePolicy policyId="messagesShortcut">
            {withSuspense(MessagingPage)}
          </RequireRoutePolicy>
        ),
      },

      // Legal & Info
      { path: "conditions-utilisation", element: withSuspense(TermsPage) },
      { path: "terms", element: withSuspense(TermsPage) },
      { path: "confidentialite", element: withSuspense(PrivacyPage) },
      { path: "privacy", element: withSuspense(PrivacyPage) },
      { path: "cookies", element: withSuspense(PrivacyPage) },
      { path: "mentions-legales", element: withSuspense(LegalNoticesPage) },
      { path: "accessibilite", element: withSuspense(AccessibilityPage) },
      { path: "aide", element: withSuspense(HelpCenterPage) },
      { path: "support", element: withSuspense(HelpCenterPage) },
      { path: "securite", element: withSuspense(HelpSafetyPage) },
      { path: "contact", element: withSuspense(ContactPage) },
      { path: "newsletter", element: withSuspense(NewsletterLandingPage) },
      {
        path: "newsletter/confirmer",
        element: withSuspense(NewsletterConfirmPage),
      },
      {
        path: "newsletter/desabonnement",
        element: withSuspense(NewsletterUnsubscribePage),
      },
      { path: "account/delete", element: withSuspense(AccountDeletionPage) },

      // Customer account and professional workspaces.
      {
        path: "compte",
        element: (
          <RequireRoutePolicy policyId="accountOverview">
            <AccountLayout />
          </RequireRoutePolicy>
        ),
        children: [
          { index: true, element: withSuspense(AccountOverviewPage) },
          {
            path: "annonces",
            element: (
              <RequireRoutePolicy policyId="accountListings">
                {withSuspense(MyListingsPage)}
              </RequireRoutePolicy>
            ),
          },
          {
            path: "favoris",
            element: (
              <RequireRoutePolicy policyId="accountFavorites">
                {withSuspense(FavoritesPage)}
              </RequireRoutePolicy>
            ),
          },
          {
            path: "recherches",
            element: (
              <RequireRoutePolicy policyId="accountSavedSearches">
                {withSuspense(SavedSearchesPage)}
              </RequireRoutePolicy>
            ),
          },
          {
            path: "messages",
            element: (
              <RequireRoutePolicy policyId="accountMessages">
                {withSuspense(MessagingPage)}
              </RequireRoutePolicy>
            ),
          },
          {
            path: "notifications",
            element: (
              <RequireRoutePolicy policyId="accountNotifications">
                {withSuspense(NotificationsPage)}
              </RequireRoutePolicy>
            ),
          },
          {
            path: "notifications/preferences",
            element: (
              <RequireRoutePolicy policyId="accountNotificationPreferences">
                {withSuspense(NotificationPreferencesPage)}
              </RequireRoutePolicy>
            ),
          },
          {
            path: "achats",
            element: (
              <RequireRoutePolicy policyId="accountPurchases">
                {withSuspense(TransactionsPage)}
              </RequireRoutePolicy>
            ),
          },
          {
            path: "finances",
            element: (
              <RequireRoutePolicy policyId="accountFinances">
                {withSuspense(AccountFinancePage)}
              </RequireRoutePolicy>
            ),
          },
          {
            path: "verification",
            element: (
              <RequireRoutePolicy policyId="accountVerification">
                {withSuspense(VerificationCenterPage)}
              </RequireRoutePolicy>
            ),
          },
          {
            path: "securite-compte",
            element: (
              <RequireRoutePolicy policyId="accountSecurity">
                {withSuspense(AccountSecurityPage)}
              </RequireRoutePolicy>
            ),
          },
          {
            path: "type-de-compte",
            element: (
              <RequireRoutePolicy policyId="accountType">
                {withSuspense(AccountTypeOnboardingPage)}
              </RequireRoutePolicy>
            ),
          },
          {
            path: "support",
            element: (
              <RequireRoutePolicy policyId="accountSupport">
                {withSuspense(SupportRequestsPage)}
              </RequireRoutePolicy>
            ),
          },
          {
            path: "support/:id",
            element: (
              <RequireRoutePolicy policyId="accountSupportDetail">
                {withSuspense(SupportRequestDetailPage)}
              </RequireRoutePolicy>
            ),
          },
          {
            path: "newsletter",
            element: (
              <RequireRoutePolicy policyId="accountNewsletter">
                {withSuspense(NewsletterPreferencesPage)}
              </RequireRoutePolicy>
            ),
          },
          {
            path: "profil",
            element: (
              <RequireRoutePolicy policyId="accountProfile">
                {withSuspense(AccountOverviewPage)}
              </RequireRoutePolicy>
            ),
          },
          {
            path: "education",
            element: (
              <RequireRoutePolicy policyId="accountCourse">
                {withSuspense(CourseTutorWorkspacePage)}
              </RequireRoutePolicy>
            ),
          },
          {
            path: "education/organisation",
            element: (
              <RequireRoutePolicy policyId="accountCourseOrganization">
                {withSuspense(CourseOrganizationWorkspacePage)}
              </RequireRoutePolicy>
            ),
          },
          { path: "cours/*", element: <LegacyEducationRedirect /> },
          { path: "cours", element: <LegacyEducationRedirect /> },
          {
            path: "auto",
            element: (
              <RequireRoutePolicy policyId="accountAuto">
                {withSuspense(AutoDealerWorkspacePage)}
              </RequireRoutePolicy>
            ),
          },
          {
            path: "immo",
            element: (
              <RequireRoutePolicy policyId="accountRealEstate">
                {withSuspense(ImmoAgencyWorkspacePage)}
              </RequireRoutePolicy>
            ),
          },
          {
            path: "emploi",
            element: (
              <RequireRoutePolicy policyId="accountEmploymentCandidate">
                {withSuspense(EmploymentCandidateWorkspacePage)}
              </RequireRoutePolicy>
            ),
          },
          {
            path: "emploi/recruteur",
            element: (
              <RequireRoutePolicy policyId="accountEmploymentRecruiter">
                {withSuspense(EmploymentRecruiterWorkspacePage)}
              </RequireRoutePolicy>
            ),
          },

          // Pro sub-routes
          {
            path: "pro/tableau-de-bord",
            element: (
              <RequireRoutePolicy policyId="accountProDashboard">
                {withSuspense(ProDashboardPage)}
              </RequireRoutePolicy>
            ),
          },
          {
            path: "pro/vitrine",
            element: (
              <RequireRoutePolicy policyId="accountProStorefront">
                {withSuspense(ProStorefrontEditorPage)}
              </RequireRoutePolicy>
            ),
          },
          {
            path: "pro/abonnements",
            element: (
              <RequireRoutePolicy policyId="accountProSubscriptions">
                {withSuspense(ProPlansPage)}
              </RequireRoutePolicy>
            ),
          },
          {
            path: "pro/finances",
            element: (
              <RequireRoutePolicy policyId="accountProFinances">
                {withSuspense(OrganizationFinancePage)}
              </RequireRoutePolicy>
            ),
          },
        ],
      },

      // 404
      { path: "*", element: withSuspense(NotFoundPage) },
    ],
  },

  // Internal Staff & Admin Routes (Partitioned Layout)
  {
    path: "/admin",
    element: (
      <RequireRoutePolicy policyId="adminOverview" standalone>
        <AdminLayout />
      </RequireRoutePolicy>
    ),
    children: [
      { index: true, element: withSuspense(AdminOverviewPage) },
      {
        path: "moderation",
        element: (
          <RequireRoutePolicy policyId="adminModeration">
            {withSuspense(AdminModerationPage)}
          </RequireRoutePolicy>
        ),
      },
      {
        path: "utilisateurs",
        element: (
          <RequireRoutePolicy policyId="adminUsers">
            {withSuspense(AdminUsersPage)}
          </RequireRoutePolicy>
        ),
      },
      {
        path: "verifications",
        element: (
          <RequireRoutePolicy policyId="adminVerifications">
            {withSuspense(AdminVerificationsPage)}
          </RequireRoutePolicy>
        ),
      },
      {
        path: "marches",
        element: (
          <RequireRoutePolicy policyId="adminMarkets">
            {withSuspense(AdminMarketsPage)}
          </RequireRoutePolicy>
        ),
      },
      {
        path: "fournisseurs",
        element: (
          <RequireRoutePolicy policyId="adminProviders">
            {withSuspense(AdminProvidersPage)}
          </RequireRoutePolicy>
        ),
      },
      {
        path: "fournisseurs/:providerId",
        element: (
          <RequireRoutePolicy policyId="adminProviderDetail">
            {withSuspense(AdminProviderDetailPage)}
          </RequireRoutePolicy>
        ),
      },
      {
        path: "taxonomie",
        element: (
          <RequireRoutePolicy policyId="adminTaxonomy">
            {withSuspense(AdminTaxonomyPage)}
          </RequireRoutePolicy>
        ),
      },
      {
        path: "taxonomy",
        element: (
          <RequireRoutePolicy policyId="adminTaxonomyAlias">
            {withSuspense(AdminTaxonomyPage)}
          </RequireRoutePolicy>
        ),
      },
      {
        path: "monetisation",
        element: (
          <RequireRoutePolicy policyId="adminMonetization">
            {withSuspense(AdminMonetizationPage)}
          </RequireRoutePolicy>
        ),
      },
      {
        path: "finance",
        element: (
          <RequireRoutePolicy policyId="adminFinance">
            {withSuspense(AdminFinancePage)}
          </RequireRoutePolicy>
        ),
      },
      {
        path: "tendances",
        element: (
          <RequireRoutePolicy policyId="adminTrending">
            {withSuspense(AdminTrendingPage)}
          </RequireRoutePolicy>
        ),
      },
      {
        path: "roles",
        element: (
          <RequireRoutePolicy policyId="adminRoles">
            {withSuspense(AdminRolesMatrixPage)}
          </RequireRoutePolicy>
        ),
      },
      {
        path: "audit",
        element: (
          <RequireRoutePolicy policyId="adminAudit">
            {withSuspense(AdminAuditLogsPage)}
          </RequireRoutePolicy>
        ),
      },
      {
        path: "newsletter",
        element: (
          <RequireRoutePolicy policyId="adminNewsletter">
            {withSuspense(AdminNewsletterPage)}
          </RequireRoutePolicy>
        ),
      },
      {
        path: "education",
        element: (
          <RequireRoutePolicy policyId="adminCourse">
            {withSuspense(AdminCoursesPage)}
          </RequireRoutePolicy>
        ),
      },
      { path: "cours", element: <LegacyEducationRedirect /> },
      {
        path: "auto",
        element: (
          <RequireRoutePolicy policyId="adminAuto">
            {withSuspense(AdminAutoPage)}
          </RequireRoutePolicy>
        ),
      },
      {
        path: "immo",
        element: (
          <RequireRoutePolicy policyId="adminRealEstate">
            {withSuspense(AdminImmoPage)}
          </RequireRoutePolicy>
        ),
      },
      {
        path: "emploi",
        element: (
          <RequireRoutePolicy policyId="adminEmployment">
            {withSuspense(EmploymentAdminPage)}
          </RequireRoutePolicy>
        ),
      },
      // CRM & AI Prospecting
      {
        path: "crm",
        element: (
          <RequireRoutePolicy policyId="adminCrm">
            {withSuspense(CrmOverviewPage)}
          </RequireRoutePolicy>
        ),
      },
      {
        path: "crm/contacts",
        element: (
          <RequireRoutePolicy policyId="adminCrmContacts">
            {withSuspense(CrmContactsPage)}
          </RequireRoutePolicy>
        ),
      },
      {
        path: "crm/contacts/:id",
        element: (
          <RequireRoutePolicy policyId="adminCrmContactDetail">
            {withSuspense(CrmContactDetailPage)}
          </RequireRoutePolicy>
        ),
      },
      {
        path: "crm/entreprises",
        element: (
          <RequireRoutePolicy policyId="adminCrmCompanies">
            {withSuspense(CrmCompaniesPage)}
          </RequireRoutePolicy>
        ),
      },
      {
        path: "crm/entreprises/:id",
        element: (
          <RequireRoutePolicy policyId="adminCrmCompanyDetail">
            {withSuspense(CrmCompanyDetailPage)}
          </RequireRoutePolicy>
        ),
      },
      {
        path: "crm/pipeline",
        element: (
          <RequireRoutePolicy policyId="adminCrmPipeline">
            {withSuspense(CrmPipelinePage)}
          </RequireRoutePolicy>
        ),
      },
      {
        path: "crm/prospection",
        element: (
          <RequireRoutePolicy policyId="adminCrmProspecting">
            {withSuspense(CrmAiProspectingPage)}
          </RequireRoutePolicy>
        ),
      },
      {
        path: "crm/taches",
        element: (
          <RequireRoutePolicy policyId="adminCrmTasks">
            {withSuspense(CrmTasksPage)}
          </RequireRoutePolicy>
        ),
      },
    ],
  },
]);

export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};
