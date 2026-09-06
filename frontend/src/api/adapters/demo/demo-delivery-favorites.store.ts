export class DemoDeliveryFavoritesStore {
  private readonly requestIdsByScope = new Map<string, Set<string>>();

  list(accountId: string, marketCode: string): string[] {
    return [
      ...(this.requestIdsByScope.get(this.key(accountId, marketCode)) ?? []),
    ];
  }

  set(
    accountId: string,
    requestId: string,
    marketCode: string,
    isFavorite: boolean,
  ): boolean {
    const scopeKey = this.key(accountId, marketCode);
    const requestIds =
      this.requestIdsByScope.get(scopeKey) ?? new Set<string>();
    if (isFavorite) requestIds.add(requestId);
    else requestIds.delete(requestId);
    this.requestIdsByScope.set(scopeKey, requestIds);
    return requestIds.has(requestId);
  }

  private key(accountId: string, marketCode: string): string {
    return `${accountId}:${marketCode.toUpperCase()}`;
  }
}

/** Shared only by the lazily loaded demo adapters, mirroring the server's
 * unified favorite collection while keeping delivery as mutation owner. */
export const demoDeliveryFavoritesStore = new DemoDeliveryFavoritesStore();
