import {
  Listing,
  Conversation,
  Transaction,
  NotificationItem,
  SavedSearch,
  RecentSearch,
  UserProfile,
  UserRole,
} from "../types";
import {
  INITIAL_LISTINGS,
  INITIAL_CONVERSATIONS,
  INITIAL_MESSAGES,
  INITIAL_TRANSACTIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_SAVED_SEARCHES,
  DEMO_USERS,
} from "../mocks/initialDemoData";
import { Market } from "../domains/market/market.types";
import { INITIAL_MARKETS } from "../domains/market/market.defaults";
import { normalizeListingTaxonomyIdentity } from "../domains/taxonomy/taxonomy.identity";

/** The user key a signed-out visitor is stored under. */
const GUEST_USER_KEY = "guest";

/** Emitted after structured recent-search state changes in this browser tab. */
export const RECENT_SEARCH_ITEMS_CHANGED_EVENT =
  "shongre:recent-search-items-changed";
/** Emitted after demo market configuration changes in this browser tab. */
export const MARKETS_CHANGED_EVENT = "shongre:markets-changed";
export const MARKETS_STORAGE_KEY = "shongre_markets_v2";

const KEYS = {
  USERS: "shongre_users_v1",
  LISTINGS: "shongre_listings_v1",
  CURRENT_USER_ROLE: "shongre_current_role_v1",
  CONVERSATIONS: "shongre_conversations_v1",
  MESSAGES: "shongre_messages_v1",
  TRANSACTIONS: "shongre_transactions_v1",
  NOTIFICATIONS: "shongre_notifications_v1",
  // v2: per-user map. v1 was a single shared array — see getFavorites below.
  FAVORITES: "shongre_favorites_v2",
  FOLLOWED_SELLERS: "shongre_followed_sellers_v1",
  BLOCKED_USERS: "shongre_blocked_users_v1",
  USER_REPORTS: "shongre_user_reports_v1",
  SAVED_SEARCHES: "shongre_saved_searches_v1",
  RECENT_SEARCHES: "shongre_recent_searches_v1",
  RECENT_SEARCH_ITEMS: "shongre_recent_search_items_v1",
  RECENTLY_VIEWED: "shongre_recently_viewed_v1",
  LOCATION_PREF: "shongre_location_preference_v1",
  PUBLISH_DRAFT: "shongre_publish_draft_v1",
  MARKETS: MARKETS_STORAGE_KEY,
  ACTIVE_MARKET: "shongre_active_market_v1",
  USER_LOCALE: "shongre_user_locale_v1",
  USER_CURRENCY: "shongre_user_currency_v1",
};

class StorageService {
  private memoryStore = new Map<string, string>();

  private notifyRecentSearchItemsChanged(): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(RECENT_SEARCH_ITEMS_CHANGED_EVENT));
    }
  }

  get<T>(key: string, fallback: T): T {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
      }
      const memItem = this.memoryStore.get(key);
      return memItem ? JSON.parse(memItem) : fallback;
    } catch {
      return fallback;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      const serialized = JSON.stringify(value);
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, serialized);
      }
      this.memoryStore.set(key, serialized);
    } catch (e) {
      console.warn("Storage write failed", e);
    }
  }

  remove(key: string): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      this.memoryStore.delete(key);
    } catch (e) {
      console.warn("Storage remove failed", e);
    }
  }

  // Listings
  getListings(): Listing[] {
    const list = this.get<Listing[]>(KEYS.LISTINGS, INITIAL_LISTINGS);
    return list.map((l) => {
      const canonicalCategory = normalizeListingTaxonomyIdentity(l);

      const primaryMarket = ((l as any).marketCode || "FR").toUpperCase();
      const rawCodes =
        (l as any).marketCodes &&
        Array.isArray((l as any).marketCodes) &&
        (l as any).marketCodes.length > 0
          ? (l as any).marketCodes
          : [primaryMarket];
      const marketCodes: string[] = Array.from(
        new Set(rawCodes.map((c: string) => c.toUpperCase())),
      );

      const marketPublications =
        (l as any).marketPublications &&
        Array.isArray((l as any).marketPublications) &&
        (l as any).marketPublications.length > 0
          ? (l as any).marketPublications
          : marketCodes.map((mCode) => ({
              marketCode: mCode,
              status: (l.status === "active" ? "active" : "draft") as
                "active" | "draft",
              isPrimary: mCode === primaryMarket,
              publishedAt: l.createdAt,
              currency: l.currency || (mCode === "CH" ? "CHF" : "EUR"),
              complianceChecked: true,
            }));

      return {
        ...l,
        ...canonicalCategory,
        marketCode: primaryMarket,
        marketCodes,
        marketPublications,
      };
    });
  }

  saveListings(listings: Listing[]): void {
    this.set(KEYS.LISTINGS, listings);
  }

  saveListing(listing: Listing): void {
    const listings = this.getListings();
    const index = listings.findIndex((l) => l.id === listing.id);
    if (index >= 0) {
      listings[index] = listing;
    } else {
      listings.unshift(listing);
    }
    this.saveListings(listings);
  }

  updateListingStatus(id: string, status: Listing["status"]): void {
    const listings = this.getListings();
    const target = listings.find((l) => l.id === id);
    if (target) {
      target.status = status;
      this.saveListing(target);
    }
  }

  // Favorites
  //
  // Saved listings belong to an account, so they are stored per user rather than
  // in one shared list. They were shared: signing in as the pro seller showed
  // the buyer's saved listings back as "Mes annonces favorites", and every demo
  // persona inherited whatever the previous one had saved — which also made the
  // seeded demo state non-deterministic once anyone clicked a heart.
  //
  // The guest bucket is real storage, not a throwaway: someone can save listings
  // before they have an account, and `mergeGuestFavorites` carries those saves
  // into the account they sign in to.

  private getFavoritesByUser(): Record<string, string[]> {
    return this.get<Record<string, string[]>>(KEYS.FAVORITES, {
      // The seeded demo buyer keeps the two listings the fixtures assume.
      buyer_thomas: ["list-101", "list-105"],
    });
  }

  getFavorites(userKey: string = this.getCurrentUserKey()): string[] {
    return this.getFavoritesByUser()[userKey] ?? [];
  }

  toggleFavorite(
    listingId: string,
    userKey: string = this.getCurrentUserKey(),
  ): boolean {
    const byUser = this.getFavoritesByUser();
    const current = byUser[userKey] ?? [];
    const exists = current.includes(listingId);
    const updated = exists
      ? current.filter((id) => id !== listingId)
      : [...current, listingId];
    this.set(KEYS.FAVORITES, { ...byUser, [userKey]: updated });
    return !exists;
  }

  /**
   * Moves anything saved while signed out into the account just signed in to.
   *
   * Union rather than replace, so an account's existing saves survive, and the
   * guest bucket is emptied afterwards — leaving it would hand the next signed-out
   * visitor on this device the previous one's saved listings.
   *
   * The target defaults to the same accessor the reads use rather than to a
   * caller-supplied account id, because `setCurrentRole` remaps the stored key
   * onto a demo persona right after login: merging into `user.id` would fill a
   * bucket that `getFavorites` never looks in.
   */
  mergeGuestFavorites(userKey: string = this.getCurrentUserKey()): void {
    if (userKey === GUEST_USER_KEY) return;
    const byUser = this.getFavoritesByUser();
    const guestSaved = byUser[GUEST_USER_KEY] ?? [];
    if (guestSaved.length === 0) return;

    const merged = Array.from(
      new Set([...(byUser[userKey] ?? []), ...guestSaved]),
    );
    this.set(KEYS.FAVORITES, {
      ...byUser,
      [userKey]: merged,
      [GUEST_USER_KEY]: [],
    });
  }

  // Role & Current User Selection
  getCurrentUserKey(): string {
    return this.get<string>("shongre_current_user_key_v1", "buyer_thomas");
  }

  setCurrentUserKey(userKey: string): void {
    this.set("shongre_current_user_key_v1", userKey);
  }

  getCurrentRole(): UserRole {
    return this.get<UserRole>(KEYS.CURRENT_USER_ROLE, "buyer");
  }

  setCurrentRole(role: UserRole): void {
    this.set(KEYS.CURRENT_USER_ROLE, role);
    // Find matching demo user key if possible
    if (role === "guest") {
      this.setCurrentUserKey(GUEST_USER_KEY);
    } else if (role === "buyer" || role === "individual_buyer") {
      this.setCurrentUserKey("buyer_thomas");
    } else if (role === "seller" || role === "individual_seller") {
      this.setCurrentUserKey("seller_camille");
    } else if (role === "pro_seller") {
      this.setCurrentUserKey("pro_atelier");
    } else if (role === "moderator") {
      this.setCurrentUserKey("moderator_claire");
    } else if (role === "support") {
      this.setCurrentUserKey("support_hugo");
    } else if (role === "operations") {
      this.setCurrentUserKey("ops_elena");
    } else if (role === "finance") {
      this.setCurrentUserKey("finance_marc");
    } else if (role === "commercial") {
      this.setCurrentUserKey("commercial_lea");
    } else if (role === "content_manager") {
      this.setCurrentUserKey("content_julien");
    } else if (role === "market_manager") {
      this.setCurrentUserKey("market_mgr_fr");
    } else if (role === "admin") {
      this.setCurrentUserKey("admin_antoine");
    } else if (role === "super_admin") {
      this.setCurrentUserKey("super_admin_alex");
    }
  }

  getCurrentUser(overrideKeyOrRole?: string): UserProfile | null {
    const key = overrideKeyOrRole || this.getCurrentUserKey();
    if (key === GUEST_USER_KEY) return null;

    const users = this.getUsers();
    // 1. Direct key match (e.g. buyer_thomas, pro_pending_sophie)
    if (users[key]) {
      return users[key];
    }

    // 2. Direct ID match (e.g. user_thomas, user_pro_atelier)
    const byId = Object.values(users).find((u) => u.id === key);
    if (byId) return byId;

    // 3. Fallback to DEMO_USERS key
    if (DEMO_USERS[key]) {
      return DEMO_USERS[key];
    }

    // 4. Role fallback
    if (key === "individual_buyer" || key === "buyer")
      return users.buyer_thomas || DEMO_USERS.buyer_thomas;
    if (key === "individual_seller" || key === "seller")
      return users.seller_camille || DEMO_USERS.seller_camille;
    if (key === "pro_seller")
      return users.pro_atelier || DEMO_USERS.pro_atelier;
    if (key === "moderator")
      return users.moderator_claire || DEMO_USERS.moderator_claire;
    if (key === "support") return users.support_hugo || DEMO_USERS.support_hugo;
    if (key === "operations") return users.ops_elena || DEMO_USERS.ops_elena;
    if (key === "finance") return users.finance_marc || DEMO_USERS.finance_marc;
    if (key === "commercial")
      return users.commercial_lea || DEMO_USERS.commercial_lea;
    if (key === "content_manager")
      return users.content_julien || DEMO_USERS.content_julien;
    if (key === "market_manager")
      return users.market_mgr_fr || DEMO_USERS.market_mgr_fr;
    if (key === "admin") return users.admin_antoine || DEMO_USERS.admin_antoine;
    if (key === "super_admin")
      return users.super_admin_alex || DEMO_USERS.super_admin_alex;

    return users.buyer_thomas || DEMO_USERS.buyer_thomas;
  }

  // Conversations & Messages
  getConversations(): Conversation[] {
    return this.get<Conversation[]>(KEYS.CONVERSATIONS, INITIAL_CONVERSATIONS);
  }

  saveConversations(convs: Conversation[]): void {
    this.set(KEYS.CONVERSATIONS, convs);
  }

  /**
   * Unread messages for one user only.
   *
   * Header, mobile nav and the account sidebar each used to reduce over *every*
   * conversation in storage, while the inbox renders only the current user's —
   * so a signed-in user saw a badge count for conversations they cannot open.
   * Badge and inbox must read from the same scope.
   */
  getUnreadMessageCount(userId?: string | null): number {
    if (!userId) return 0;
    return this.getConversations()
      .filter((c) => c.buyerId === userId || c.sellerId === userId)
      .reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }

  getMessages(conversationId: string): import("../types").Message[] {
    const all = this.get<Record<string, import("../types").Message[]>>(
      KEYS.MESSAGES,
      INITIAL_MESSAGES,
    );
    return all[conversationId] || [];
  }

  saveMessage(
    conversationId: string,
    message: import("../types").Message,
  ): void {
    const all = this.get<Record<string, import("../types").Message[]>>(
      KEYS.MESSAGES,
      INITIAL_MESSAGES,
    );
    const list = all[conversationId] || [];
    list.push(message);
    all[conversationId] = list;
    this.set(KEYS.MESSAGES, all);

    // Update conversation lastMessage
    const convs = this.getConversations();
    const convIndex = convs.findIndex((c) => c.id === conversationId);
    if (convIndex >= 0) {
      convs[convIndex].lastMessage = message.content;
      convs[convIndex].lastMessageAt = message.createdAt;
      this.saveConversations(convs);
    }
  }

  // Transactions
  getTransactions(): Transaction[] {
    return this.get<Transaction[]>(KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
  }

  saveTransaction(tx: Transaction): void {
    const list = this.getTransactions();
    const index = list.findIndex((t) => t.id === tx.id);
    if (index >= 0) {
      list[index] = tx;
    } else {
      list.unshift(tx);
    }
    this.set(KEYS.TRANSACTIONS, list);
  }

  // Notifications
  getNotifications(): NotificationItem[] {
    return this.get<NotificationItem[]>(
      KEYS.NOTIFICATIONS,
      INITIAL_NOTIFICATIONS,
    );
  }

  saveNotifications(notifications: NotificationItem[]): void {
    this.set(KEYS.NOTIFICATIONS, notifications);
  }

  addNotification(notification: NotificationItem): void {
    const list = this.getNotifications();
    list.unshift(notification);
    this.saveNotifications(list);
  }

  markNotificationRead(id: string): void {
    const list = this.getNotifications().map((n) =>
      n.id === id ? { ...n, isRead: true } : n,
    );
    this.set(KEYS.NOTIFICATIONS, list);
  }

  markAllNotificationsRead(): void {
    const list = this.getNotifications().map((n) => ({ ...n, isRead: true }));
    this.set(KEYS.NOTIFICATIONS, list);
  }

  // Generic Storage Accessors for Domain Services
  getByKey<T>(key: string, fallback: T): T {
    return this.get<T>(key, fallback);
  }

  setByKey<T>(key: string, value: T): void {
    this.set<T>(key, value);
  }

  // Saved Searches
  getSavedSearches(): SavedSearch[] {
    return this.get<SavedSearch[]>(KEYS.SAVED_SEARCHES, INITIAL_SAVED_SEARCHES);
  }

  saveSearch(search: SavedSearch): void {
    const list = this.getSavedSearches();
    list.unshift(search);
    this.set(KEYS.SAVED_SEARCHES, list);
  }

  deleteSavedSearch(id: string): void {
    const list = this.getSavedSearches().filter((s) => s.id !== id);
    this.set(KEYS.SAVED_SEARCHES, list);
  }

  removeSavedSearch(id: string): void {
    this.deleteSavedSearch(id);
  }

  // Recent Searches
  getRecentSearches(): string[] {
    return this.get<string[]>(KEYS.RECENT_SEARCHES, [
      "Vélo gravel",
      "iPhone 15 Pro",
      "Fauteuil vintage chêne",
      "PS5",
    ]);
  }

  addRecentSearch(query: string): void {
    if (!query.trim()) return;
    const list = this.getRecentSearches().filter(
      (q) => q.toLowerCase() !== query.toLowerCase(),
    );
    list.unshift(query.trim());
    this.set(KEYS.RECENT_SEARCHES, list.slice(0, 8));
  }

  // Structured Recent Searches (Home & Header Cards)
  getRecentSearchItems(): RecentSearch[] {
    return this.get<RecentSearch[]>(KEYS.RECENT_SEARCH_ITEMS, [
      {
        id: "recent-search-1",
        title: "Antiquités",
        locationLabel: "Toute la France",
        categorySlug: "antiquites",
        to: "/recherche?category=antiquites",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "recent-search-2",
        title: "Accessoires & bagagerie",
        locationLabel: "Toute la France",
        categorySlug: "accessoires-bagagerie",
        to: "/recherche?category=accessoires-bagagerie",
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: "recent-search-3",
        title: "Photo, audio & vidéo",
        locationLabel: "Bray-Dunes (59123)",
        categorySlug: "multimedia",
        to: "/recherche?category=multimedia&location=Bray-Dunes",
        createdAt: new Date(Date.now() - 10800000).toISOString(),
      },
    ]);
  }

  addRecentSearchItem(item: Omit<RecentSearch, "id" | "createdAt">): void {
    const list = this.getRecentSearchItems().filter((s) => s.to !== item.to);
    const newItem: RecentSearch = {
      ...item,
      id: `recent-search-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    list.unshift(newItem);
    this.set(KEYS.RECENT_SEARCH_ITEMS, list.slice(0, 8));
    this.notifyRecentSearchItemsChanged();
  }

  deleteRecentSearchItem(id: string): void {
    const list = this.getRecentSearchItems().filter((item) => item.id !== id);
    this.set(KEYS.RECENT_SEARCH_ITEMS, list);
    this.notifyRecentSearchItemsChanged();
  }

  clearRecentSearchItems(): void {
    this.set(KEYS.RECENT_SEARCH_ITEMS, []);
    this.notifyRecentSearchItemsChanged();
  }

  // Recently Viewed
  getRecentlyViewed(): string[] {
    return this.get<string[]>(KEYS.RECENTLY_VIEWED, [
      "list-101",
      "list-103",
      "list-102",
    ]);
  }

  addRecentlyViewed(listingId: string): void {
    const list = this.getRecentlyViewed().filter((id) => id !== listingId);
    list.unshift(listingId);
    this.set(KEYS.RECENTLY_VIEWED, list.slice(0, 10));
  }

  // Followed Sellers
  getFollowedSellers(): string[] {
    return this.get<string[]>(KEYS.FOLLOWED_SELLERS, []);
  }

  toggleFollowSeller(sellerId: string): boolean {
    const follows = this.getFollowedSellers();
    const exists = follows.includes(sellerId);
    const updated = exists
      ? follows.filter((id) => id !== sellerId)
      : [...follows, sellerId];
    this.set(KEYS.FOLLOWED_SELLERS, updated);
    return !exists;
  }

  isFollowingSeller(sellerId: string): boolean {
    return this.getFollowedSellers().includes(sellerId);
  }

  // Blocked Users
  getBlockedUsers(): string[] {
    return this.get<string[]>(KEYS.BLOCKED_USERS, []);
  }

  blockUser(userId: string): void {
    const blocked = this.getBlockedUsers();
    if (!blocked.includes(userId)) {
      this.set(KEYS.BLOCKED_USERS, [...blocked, userId]);
    }
  }

  unblockUser(userId: string): void {
    const blocked = this.getBlockedUsers();
    this.set(
      KEYS.BLOCKED_USERS,
      blocked.filter((id) => id !== userId),
    );
  }

  toggleBlockUser(userId: string): boolean {
    const blocked = this.getBlockedUsers();
    const exists = blocked.includes(userId);
    const updated = exists
      ? blocked.filter((id) => id !== userId)
      : [...blocked, userId];
    this.set(KEYS.BLOCKED_USERS, updated);
    return !exists;
  }

  isUserBlocked(userId: string): boolean {
    return this.getBlockedUsers().includes(userId);
  }

  // Notification Preferences
  getNotificationPreferences<T>(userId: string): T | null {
    return this.get<T | null>(`shongre_notif_prefs_${userId}`, null);
  }

  saveNotificationPreferences<T>(userId: string, prefs: T): void {
    this.set(`shongre_notif_prefs_${userId}`, prefs);
  }

  // Support Requests
  getSupportRequests<T>(defaultRequests: T): T {
    return this.get<T>("shongre_support_requests", defaultRequests);
  }

  saveSupportRequests<T>(requests: T): void {
    this.set("shongre_support_requests", requests);
  }

  // Reports
  getUserReports(): any[] {
    return this.get<any[]>(KEYS.USER_REPORTS, []);
  }

  saveUserReport(report: {
    targetUserId: string;
    targetUserName?: string;
    reason: string;
    comment?: string;
  }): void {
    const reports = this.getUserReports();
    reports.push({
      ...report,
      id: `report-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: "pending",
    });
    this.set(KEYS.USER_REPORTS, reports);
  }

  deleteUserReport(reportId: string): void {
    const reports = this.getUserReports().filter((r) => r.id !== reportId);
    this.set(KEYS.USER_REPORTS, reports);
  }

  resolveUserReport(reportId: string, resolutionNote?: string): void {
    const reports = this.getUserReports().map((r) =>
      r.id === reportId
        ? {
            ...r,
            status: "resolved",
            resolvedAt: new Date().toISOString(),
            resolutionNote,
          }
        : r,
    );
    this.set(KEYS.USER_REPORTS, reports);
  }

  updateUserReportStatus(
    reportId: string,
    status: "pending" | "resolved" | "dismissed",
  ): void {
    const reports = this.getUserReports().map((r) =>
      r.id === reportId
        ? { ...r, status, updatedAt: new Date().toISOString() }
        : r,
    );
    this.set(KEYS.USER_REPORTS, reports);
  }

  // Users store
  getUsers(): Record<string, UserProfile> {
    return this.get<Record<string, UserProfile>>(KEYS.USERS, DEMO_USERS);
  }

  getUser(idOrKey: string): UserProfile | null {
    const users = this.getUsers();
    if (users[idOrKey]) return users[idOrKey];
    return Object.values(users).find((u) => u.id === idOrKey) || null;
  }

  saveUsers(users: Record<string, UserProfile>): void {
    this.set(KEYS.USERS, users);
  }

  saveUser(user: UserProfile): void {
    const users = this.getUsers();
    users[user.id] = user;
    this.set(KEYS.USERS, users);
  }

  // Drafts
  getPublishDraft(): any {
    return this.get<any>(KEYS.PUBLISH_DRAFT, null);
  }

  savePublishDraft(draft: any): void {
    this.set(KEYS.PUBLISH_DRAFT, draft);
  }

  clearPublishDraft(): void {
    localStorage.removeItem(KEYS.PUBLISH_DRAFT);
  }

  // Location preference
  getLocationPreference(): any {
    return this.get<any>(KEYS.LOCATION_PREF, {
      city: "Toute la France",
      postalCode: "",
      radiusKm: 0,
      label: "Toute la France",
    });
  }

  saveLocationPreference(loc: any): void {
    this.set(KEYS.LOCATION_PREF, loc);
  }

  // Multi-Market Configuration & Active Market Store
  getMarkets(): Market[] {
    return this.get<Market[]>(KEYS.MARKETS, INITIAL_MARKETS);
  }

  saveMarkets(markets: Market[]): void {
    this.set(KEYS.MARKETS, markets);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(MARKETS_CHANGED_EVENT));
    }
  }

  getActiveMarketCode(): string {
    return this.get<string>(KEYS.ACTIVE_MARKET, "FR");
  }

  saveActiveMarketCode(code: string): void {
    this.set(KEYS.ACTIVE_MARKET, (code || "FR").toUpperCase());
  }

  // User Local Preferences
  getUserLocale(): string | null {
    return this.get<string | null>(KEYS.USER_LOCALE, null);
  }

  saveUserLocale(locale: string): void {
    this.set(KEYS.USER_LOCALE, locale);
  }

  getUserCurrency(): string | null {
    return this.get<string | null>(KEYS.USER_CURRENCY, null);
  }

  saveUserCurrency(currency: string): void {
    this.set(KEYS.USER_CURRENCY, currency.toUpperCase());
  }
}

export const storageService = new StorageService();
