import React from 'react';
import { Search, MessageSquare, ShoppingBag, Tag, CheckCheck, Clock, X } from 'lucide-react';
import { ConversationPreview, InboxFilterTab } from '../../../domains/messaging/messaging.types';
import { formatRelativeDate, formatPrice } from '../../../utilities/formatters';
import { Badge, Avatar } from '../../../design-system/primitives/Badge';

interface ConversationListProps {
  conversations: ConversationPreview[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  selectedFilter: InboxFilterTab;
  onSelectFilter: (tab: InboxFilterTab) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isLoading?: boolean;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  selectedFilter,
  onSelectFilter,
  searchQuery,
  onSearchChange,
  isLoading = false,
}) => {
  const unreadTotal = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  const tabs: { id: InboxFilterTab; label: string; count?: number }[] = [
    { id: 'all', label: 'Tous' },
    { id: 'unread', label: 'Non lus', count: unreadTotal },
    { id: 'purchases', label: 'Achats' },
    { id: 'sales', label: 'Ventes' },
    { id: 'transactions', label: 'Commandes' },
  ];

  return (
    <div className="flex flex-col h-full bg-white border-r border-border-base">
      {/* Header & Search */}
      <div className="p-4 border-b border-border-base space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <span>Messagerie</span>
          </h1>
          {unreadTotal > 0 && (
            <Badge variant="primary" size="sm">
              {unreadTotal} non lu{unreadTotal > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par nom ou annonce..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-control-md pl-9 pr-8 text-xs font-semibold bg-stone-50 border border-border-base rounded-xl focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all placeholder:text-stone-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-600 p-0.5"
              aria-label="Effacer la recherche"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {tabs.map((tab) => {
            const isActive = selectedFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-micro font-extrabold ${
                      isActive ? 'bg-primary text-white' : 'bg-primary/20 text-primary'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversation Cards Scroll Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-border-subtle">
        {isLoading ? (
          /* Skeleton Loader */
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-12 h-12 bg-stone-200 rounded-full shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-stone-200 rounded w-1/3" />
                  <div className="h-3 bg-stone-100 rounded w-3/4" />
                  <div className="h-2 bg-stone-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          /* Empty State */
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-stone-800">Aucune conversation trouvée</p>
              <p className="text-xs text-stone-500 mt-1">
                {searchQuery
                  ? 'Aucun résultat ne correspond à votre recherche.'
                  : 'Vos échanges avec les acheteurs et vendeurs apparaîtront ici.'}
              </p>
            </div>
          </div>
        ) : (
          /* List */
          conversations.map((conv) => {
            const isSelected = conv.id === activeConversationId;
            const hasUnread = conv.unreadCount > 0;
            const listingContext = conv.context?.type === 'listing' ? conv.context : null;

            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full p-3.5 text-left flex gap-3 transition-colors cursor-pointer relative ${
                  isSelected
                    ? 'bg-primary/5 border-l-4 border-primary'
                    : 'hover:bg-stone-50 bg-white'
                }`}
              >
                {/* Counterpart Avatar */}
                <div className="relative shrink-0">
                  <Avatar
                    name={conv.counterpart.name}
                    src={conv.counterpart.avatarUrl}
                    size="md"
                  />
                  {hasUnread && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full ring-2 ring-white" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className={`text-xs truncate ${hasUnread ? 'font-black text-stone-950' : 'font-bold text-stone-800'}`}>
                      {conv.counterpart.name}
                    </span>
                    <span className="text-micro text-stone-500 shrink-0 font-medium">
                      {formatRelativeDate(conv.lastMessageAt)}
                    </span>
                  </div>

                  {/* Listing Title Context */}
                  {listingContext && (
                    <div className="text-micro font-semibold text-primary truncate mb-1">
                      {listingContext.listingTitle} ({formatPrice(listingContext.listingPrice)})
                    </div>
                  )}

                  {/* Last Message Preview */}
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs truncate ${hasUnread ? 'font-bold text-stone-900' : 'text-stone-500 font-medium'}`}>
                      {conv.lastMessageText || 'Nouvelle conversation'}
                    </p>

                    {hasUnread && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded-full text-micro font-extrabold bg-primary text-white">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
