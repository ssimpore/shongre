import { routes } from '../../configuration/routes';
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, PlusCircle, MessageSquare, User } from 'lucide-react';
import { storageService } from '../../services/storage.service';
import { useAuth } from '../providers/AuthProvider';
import { usePublishCta } from '../../security/usePublishCta';

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const { currentUser } = useAuth();
  const unreadMessagesCount = storageService.getUnreadMessageCount(currentUser?.id);
  const publishCta = usePublishCta();

  // Hide bottom bar on fullscreen wizards / creation tunnels for maximum screen ergonomics
  if (location.pathname.startsWith('/deposer')) {
    return null;
  }

  return (
    <nav
      aria-label="Navigation mobile"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-border-base pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5 h-14 items-center px-1">
        {/* Home */}
        <NavLink
          to={routes.home()}
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 text-xs font-medium transition-colors ${
              isActive ? 'text-primary font-bold' : 'text-stone-500 hover:text-stone-900'
            }`
          }
        >
          <Home className="w-5 h-5" />
          <span>Accueil</span>
        </NavLink>

        {/* Search */}
        <NavLink
          to={routes.search()}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 text-xs font-medium transition-colors ${
              isActive ? 'text-primary font-bold' : 'text-stone-500 hover:text-stone-900'
            }`
          }
        >
          <Search className="w-5 h-5" />
          <span>Recherche</span>
        </NavLink>

        {/* Publish Center Highlight Button */}
        <NavLink
          to={publishCta.to}
          className="flex flex-col items-center justify-center -mt-3.5 group"
        >
          <div className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center shadow-md group-active:scale-95 transition-transform">
            <PlusCircle className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-stone-800 mt-0.5">{publishCta.shortLabel}</span>
        </NavLink>

        {/* Messages */}
        <NavLink
          to="/compte/messages"
          className={({ isActive }) =>
            `relative flex flex-col items-center justify-center gap-1 py-1 text-xs font-medium transition-colors ${
              isActive ? 'text-primary font-bold' : 'text-stone-500 hover:text-stone-900'
            }`
          }
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5" />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-primary text-white text-micro font-bold flex items-center justify-center">
                {unreadMessagesCount}
                <span className="sr-only"> messages non lus</span>
              </span>
            )}
          </div>
          <span>Messages</span>
        </NavLink>

        {/* Account */}
        <NavLink
          to="/compte"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 text-xs font-medium transition-colors ${
              isActive ? 'text-primary font-bold' : 'text-stone-500 hover:text-stone-900'
            }`
          }
        >
          <User className="w-5 h-5" />
          <span>Compte</span>
        </NavLink>
      </div>
    </nav>
  );
};
