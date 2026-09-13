import type { components } from "@shongre/contracts/openapi";
import { SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS } from "@shongre/contracts/performance";

export type UserPresence = components["schemas"]["UserPresence"];
export type PresenceHeartbeat = components["schemas"]["PresenceHeartbeat"];
export type ConversationPresencePage =
  components["schemas"]["ConversationPresencePage"];
const policy = SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.presence;

/** A connection label scoped by the authenticated principal, never a credential. */
export function createPresenceClientId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function")
    return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (value) => {
    const digit = Math.floor(Math.random() * 16);
    return (value === "x" ? digit : (digit & 3) | 8).toString(16);
  });
}

/** Shared lifecycle; Web visibility and native AppState stay in their platforms. */
export function startPresenceHeartbeat(options: {
  clientId: string;
  send: (heartbeat: PresenceHeartbeat, signal: AbortSignal) => Promise<unknown>;
  foreground: boolean;
  connected?: boolean;
  now?: () => number;
}) {
  const now = options.now ?? Date.now;
  let foreground = options.foreground;
  let connected = options.connected ?? true;
  let active = foreground;
  let stopped = false;
  let sequence = 0;
  let lastActivity = now();
  let request: AbortController | undefined;
  let queued = false;

  const send = async () => {
    if (stopped || !connected) return;
    if (request) {
      queued = true;
      return;
    }
    const activity = !foreground ? "background" : active ? "active" : "idle";
    active = false;
    const controller = new AbortController();
    request = controller;
    try {
      await options.send(
        { clientId: options.clientId, sequence: ++sequence, activity },
        controller.signal,
      );
    } catch {
      if (activity === "active") active = true;
    } finally {
      request = undefined;
      if (queued && !stopped) {
        queued = false;
        void send();
      }
    }
  };
  const timer = setInterval(() => {
    if (foreground) void send();
  }, policy.heartbeatIntervalMs);
  if (foreground) void send();
  return {
    activity() {
      const wasAway = now() - lastActivity >= policy.awayAfterMs;
      lastActivity = now();
      active = true;
      if (foreground && wasAway) void send();
    },
    foreground(value: boolean) {
      if (foreground === value) return;
      foreground = value;
      if (value) {
        active = true;
        lastActivity = now();
      }
      void send();
    },
    connected(value: boolean) {
      if (connected === value) return;
      connected = value;
      if (value && foreground) {
        active = true;
        lastActivity = now();
        void send();
      }
      if (!value) request?.abort();
    },
    stop() {
      stopped = true;
      clearInterval(timer);
      request?.abort();
    },
  };
}

/** A failed, expired, or future snapshot is never shown as current presence. */
export function currentPresence(
  value: UserPresence | undefined,
  now = Date.now(),
): UserPresence | undefined {
  const observedAt = value ? Date.parse(value.observedAt) : NaN;
  const validUntil = value ? Date.parse(value.validUntil) : NaN;
  if (
    !value ||
    !Number.isFinite(observedAt) ||
    !Number.isFinite(validUntil) ||
    observedAt > now + policy.refreshIntervalMs ||
    validUntil <= now
  )
    return undefined;
  return value;
}

export function startPresenceObserver(options: {
  read: (signal: AbortSignal) => Promise<ConversationPresencePage>;
  update: (items: ConversationPresencePage["items"]) => void;
  visible: boolean;
}) {
  let visible = options.visible;
  let stopped = false;
  let generation = 0;
  let request: AbortController | undefined;
  const refresh = async () => {
    if (!visible || stopped || request) return;
    const ownGeneration = generation;
    const controller = new AbortController();
    request = controller;
    try {
      const page = await options.read(controller.signal);
      if (!stopped && visible && ownGeneration === generation)
        options.update(page.items);
    } catch {
      if (!stopped && ownGeneration === generation) options.update([]);
    } finally {
      if (request === controller) request = undefined;
    }
  };
  const timer = setInterval(() => void refresh(), policy.refreshIntervalMs);
  void refresh();
  return {
    visible(value: boolean) {
      if (visible === value) return;
      visible = value;
      generation++;
      request?.abort();
      request = undefined;
      options.update([]);
      if (value) void refresh();
    },
    stop() {
      stopped = true;
      generation++;
      clearInterval(timer);
      request?.abort();
    },
  };
}
