import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Inject, OnApplicationShutdown } from "@nestjs/common";
import { SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS } from "@shongre/contracts/performance";
import type { Server, WebSocket } from "ws";
import { authService } from "../../modules/auth/auth.service.js";
import { messagingService } from "../../modules/messaging/messaging.service.js";
import { assertConversationParticipant } from "../../modules/messaging/api/access-policy.js";
import {
  isAuthenticated,
  requirePermission,
  type Principal,
} from "../../shared/auth/principal.js";
import { RealtimePubSub, type RealtimeEnvelope } from "./realtime-pub-sub.js";

interface ConnectionState {
  principal?: Principal;
  subscriptions: Set<string>;
}

@WebSocketGateway({ path: "/realtime" })
export class RealtimeGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnApplicationShutdown
{
  @WebSocketServer()
  private server!: Server;

  private readonly states = new WeakMap<WebSocket, ConnectionState>();
  private readonly authenticationTimers = new Map<WebSocket, NodeJS.Timeout>();
  private unsubscribe: (() => void) | undefined;

  constructor(
    @Inject(RealtimePubSub) private readonly pubSub: RealtimePubSub,
  ) {}

  afterInit(): void {
    this.unsubscribe = this.pubSub.subscribe((envelope) =>
      this.broadcast(envelope),
    );
  }

  handleConnection(client: WebSocket): void {
    this.states.set(client, { subscriptions: new Set() });
    const timer = setTimeout(() => {
      if (!this.states.get(client)?.principal)
        client.close(4401, "Authentication required");
    }, SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.realtime.authenticationTimeoutMs);
    timer.unref();
    this.authenticationTimers.set(client, timer);
    this.send(client, "connected", { authenticationRequired: true });
  }

  handleDisconnect(client: WebSocket): void {
    const timer = this.authenticationTimers.get(client);
    if (timer) clearTimeout(timer);
    this.authenticationTimers.delete(client);
    this.states.delete(client);
  }

  onApplicationShutdown(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    for (const timer of this.authenticationTimers.values()) clearTimeout(timer);
    this.authenticationTimers.clear();
  }

  @SubscribeMessage("authenticate")
  async authenticate(
    client: WebSocket,
    input: { token?: unknown },
  ): Promise<void> {
    const token = typeof input?.token === "string" ? input.token : null;
    const principal = await authService.resolvePrincipal(token);
    if (!isAuthenticated(principal)) {
      client.close(4401, "Authentication failed");
      return;
    }
    try {
      requirePermission(principal, "marketplace.customer.access");
    } catch {
      client.close(4403, "Access denied");
      return;
    }
    const state = this.states.get(client);
    if (!state) return;
    state.principal = principal;
    const timer = this.authenticationTimers.get(client);
    if (timer) clearTimeout(timer);
    this.authenticationTimers.delete(client);
    this.send(client, "authenticated", { userId: principal.userId });
  }

  @SubscribeMessage("subscribe")
  async subscribe(
    client: WebSocket,
    input: { channel?: unknown; resourceId?: unknown },
  ): Promise<void> {
    const state = this.states.get(client);
    if (!state?.principal) {
      client.close(4401, "Authentication required");
      return;
    }
    if (
      state.subscriptions.size >=
      SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.realtime
        .maximumSubscriptionsPerConnection
    ) {
      this.send(client, "subscription_error", { code: "LIMIT_REACHED" });
      return;
    }
    try {
      const channelName = await this.authorizedChannel(state.principal, input);
      state.subscriptions.add(channelName);
      this.send(client, "subscribed", {
        channel: input.channel,
        resourceId: input.resourceId,
      });
    } catch {
      this.send(client, "subscription_error", { code: "NOT_FOUND" });
    }
  }

  @SubscribeMessage("unsubscribe")
  async unsubscribeChannel(
    client: WebSocket,
    input: { channel?: unknown; resourceId?: unknown },
  ): Promise<void> {
    const state = this.states.get(client);
    if (!state?.principal) return;
    try {
      const channelName = await this.authorizedChannel(state.principal, input);
      state.subscriptions.delete(channelName);
      this.send(client, "unsubscribed", {
        channel: input.channel,
        resourceId: input.resourceId,
      });
    } catch {
      this.send(client, "subscription_error", { code: "NOT_FOUND" });
    }
  }

  private async authorizedChannel(
    principal: Principal,
    input: { channel?: unknown; resourceId?: unknown },
  ): Promise<string> {
    if (input.channel === "notifications") {
      if (input.resourceId && input.resourceId !== principal.userId)
        throw new Error("not found");
      return `user:${principal.userId}:notifications`;
    }
    if (
      input.channel === "conversation" &&
      typeof input.resourceId === "string"
    ) {
      const conversation = await messagingService.getConversationById(
        input.resourceId,
      );
      assertConversationParticipant(principal, conversation);
      return `conversation:${input.resourceId}`;
    }
    throw new Error("not found");
  }

  private broadcast(envelope: RealtimeEnvelope): void {
    for (const client of this.server.clients) {
      const state = this.states.get(client);
      if (
        client.readyState === client.OPEN &&
        state?.subscriptions.has(envelope.channelName)
      ) {
        this.send(client, envelope.event, envelope.payload);
      }
    }
  }

  private send(
    client: WebSocket,
    event: string,
    data: Record<string, unknown>,
  ): void {
    if (client.readyState === client.OPEN)
      client.send(JSON.stringify({ event, data }));
  }
}
