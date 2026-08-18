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
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-stone-200/80 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.08)]"
    >
      <div className="grid grid-cols-5 h-[3.75rem] items-center px-1">
        {/* Home */}
        <NavLink
          to={routes.home()}
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 h-full w-full transition-all duration-fast ${
              isActive ? 'text-stone-900' : 'text-stone-500 hover:text-stone-700 active:scale-95'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`flex items-center justify-center w-12 h-7 rounded-full transition-colors ${isActive ? 'bg-stone-100' : 'bg-transparent'}`}>
                <Home className={`w-[22px] h-[22px] ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              </div>
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>Accueil</span>
            </>
          )}
        </NavLink>

        {/* Search */}
        <NavLink
          to={routes.search()}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 h-full w-full transition-all duration-fast ${
              isActive ? 'text-stone-900' : 'text-stone-500 hover:text-stone-700 active:scale-95'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`flex items-center justify-center w-12 h-7 rounded-full transition-colors ${isActive ? 'bg-stone-100' : 'bg-transparent'}`}>
                <Search className={`w-[22px] h-[22px] ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              </div>
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>Recherche</span>
            </>
          )}
        </NavLink>

        {/* Publish Center Highlight Button */}
        <NavLink
          to={publishCta.to}
          className="relative flex flex-col items-center justify-center group w-full h-full"
        >
          <div className="absolute -top-5 flex flex-col items-center">
            <div className="w-[3.25rem] h-[3.25rem] rounded-full bg-stone-900 text-white flex items-center justify-center shadow-lg group-active:scale-95 transition-transform border-[3px] border-white">
              <PlusCircle className="w-6 h-6 text-primary" />
            </div>
            <span className="text-[10px] font-bold text-stone-900 mt-1 whitespace-nowrap">{publishCta.shortLabel}</span>
          </div>
        </NavLink>

        {/* Messages */}
        <NavLink
          to="/compte/messages"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 h-full w-full transition-all duration-fast ${
              isActive ? 'text-stone-900' : 'text-stone-500 hover:text-stone-700 active:scale-95'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`relative flex items-center justify-center w-12 h-7 rounded-full transition-colors ${isActive ? 'bg-stone-100' : 'bg-transparent'}`}>
                <MessageSquare className={`w-[22px] h-[22px] ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center shadow-xs border-[1.5px] border-white">
                    {unreadMessagesCount}
                    <span className="sr-only"> messages non lus</span>
                  </span>
                )}
              </div>
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>Messages</span>
            </>
          )}
        </NavLink>

        {/* Account */}
        <NavLink
          to="/compte"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 h-full w-full transition-all duration-fast ${
              isActive ? 'text-stone-900' : 'text-stone-500 hover:text-stone-700 active:scale-95'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`flex items-center justify-center w-12 h-7 rounded-full transition-colors ${isActive ? 'bg-stone-100' : 'bg-transparent'}`}>
                <User className={`w-[22px] h-[22px] ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              </div>
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>Compte</span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
};
