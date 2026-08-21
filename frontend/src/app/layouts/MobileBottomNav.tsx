import { routes } from "../../configuration/routes";
import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Search, PlusCircle, MessageSquare, User } from "lucide-react";
import { storageService } from "../../services/storage.service";
import { useAuth } from "../providers/AuthProvider";
import { usePublishCta } from "../../security/usePublishCta";
import { useTranslation } from "../../i18n/I18nProvider";
import { Icon } from "../../design-system";

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const { currentUser } = useAuth();
  const unreadMessagesCount = storageService.getUnreadMessageCount(
    currentUser?.id,
  );
  const publishCta = usePublishCta();
  const { t } = useTranslation();

  // Hide bottom bar on fullscreen wizards / creation tunnels for maximum screen ergonomics
  if (location.pathname.startsWith("/deposer")) {
    return null;
  }

  return (
    <nav
      aria-label={t("nav.mobileLabel")}
      className="md:hidden fixed bottom-0 left-0 right-0 z-header bg-bg-surface/90 backdrop-blur-xl border-t border-border-base pb-[env(safe-area-inset-bottom)] shadow-sticky"
    >
      {/* Height comes from `--mobile-nav-h` so the bar and everything pinned
          above it (toasts, the listing-detail buy bar) cannot disagree. */}
      <div className="grid grid-cols-5 h-[var(--mobile-nav-h)] items-center px-1">
        {/* Home */}
        <NavLink
          to={routes.home()}
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 h-full w-full motion-interactive ${
              isActive
                ? "text-stone-900"
                : "text-stone-500 hover:text-stone-700 active:scale-95"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`flex items-center justify-center w-12 h-7 rounded-pill motion-interactive ${isActive ? "bg-bg-muted" : "bg-transparent"}`}
              >
                <Icon
                  icon={Home}
                  size="nav"
                  weight={isActive ? "strong" : "regular"}
                />
              </div>
              <span
                className={`text-micro ${isActive ? "font-bold" : "font-medium"}`}
              >
                {t("nav.home")}
              </span>
            </>
          )}
        </NavLink>

        {/* Search */}
        <NavLink
          to={routes.search()}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 h-full w-full motion-interactive ${
              isActive
                ? "text-stone-900"
                : "text-stone-500 hover:text-stone-700 active:scale-95"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`flex items-center justify-center w-12 h-7 rounded-pill motion-interactive ${isActive ? "bg-bg-muted" : "bg-transparent"}`}
              >
                <Icon
                  icon={Search}
                  size="nav"
                  weight={isActive ? "strong" : "regular"}
                />
              </div>
              <span
                className={`text-micro ${isActive ? "font-bold" : "font-medium"}`}
              >
                {t("nav.search")}
              </span>
            </>
          )}
        </NavLink>

        {/* Publish Center Highlight Button */}
        <NavLink
          to={publishCta.to}
          className="relative flex flex-col items-center justify-center group w-full h-full"
        >
          {/* Raised by the same token the layout reserves clearance from, so the
              disc can never protrude into space the page believes is free. */}
          <div className="absolute -top-(--mobile-nav-fab-rise) flex flex-col items-center">
            <div className="w-control-fab h-control-fab rounded-pill bg-stone-900 text-white flex items-center justify-center shadow-lg group-active:scale-95 motion-interactive border-3 border-bg-surface">
              <PlusCircle className="w-6 h-6 text-primary" />
            </div>
            <span className="text-micro font-bold text-stone-900 mt-1 whitespace-nowrap">
              {t(publishCta.shortLabelKey)}
            </span>
          </div>
        </NavLink>

        {/* Messages */}
        <NavLink
          to="/compte/messages"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 h-full w-full motion-interactive ${
              isActive
                ? "text-stone-900"
                : "text-stone-500 hover:text-stone-700 active:scale-95"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`relative flex items-center justify-center w-12 h-7 rounded-pill motion-interactive ${isActive ? "bg-bg-muted" : "bg-transparent"}`}
              >
                <Icon
                  icon={MessageSquare}
                  size="nav"
                  weight={isActive ? "strong" : "regular"}
                />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-white text-micro font-bold flex items-center justify-center shadow-xs border-2 border-white">
                    {unreadMessagesCount}
                    <span className="sr-only">
                      {" "}
                      {t("nav.unreadMessages", { count: unreadMessagesCount })}
                    </span>
                  </span>
                )}
              </div>
              <span
                className={`text-micro ${isActive ? "font-bold" : "font-medium"}`}
              >
                {t("nav.messages")}
              </span>
            </>
          )}
        </NavLink>

        {/* Account */}
        <NavLink
          to="/compte"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 h-full w-full motion-interactive ${
              isActive
                ? "text-stone-900"
                : "text-stone-500 hover:text-stone-700 active:scale-95"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`flex items-center justify-center w-12 h-7 rounded-pill motion-interactive ${isActive ? "bg-bg-muted" : "bg-transparent"}`}
              >
                <Icon
                  icon={User}
                  size="nav"
                  weight={isActive ? "strong" : "regular"}
                />
              </div>
              <span
                className={`text-micro ${isActive ? "font-bold" : "font-medium"}`}
              >
                {t("nav.account")}
              </span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
};
