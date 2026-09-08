import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import WebSocket from "ws";
import { createBackendApplication } from "../../src/app/server/index.js";
import {
  DEMO_ACCOUNT_PASSWORD,
  seedDemoCredentials,
} from "../../src/app/bootstrap/seed-demo-credentials.js";
import { realtimePubSub } from "../../src/infrastructure/realtime/realtime-pub-sub.js";

function nextEvent(
  socket: WebSocket,
  expectedEvent: string,
  timeoutMs = 2_000,
): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${expectedEvent}`));
    }, timeoutMs);
    const onMessage = (raw: WebSocket.RawData) => {
      const message = JSON.parse(raw.toString()) as Record<string, any>;
      if (message.event !== expectedEvent) return;
      cleanup();
      resolve(message);
    };
    const cleanup = () => {
      clearTimeout(timeout);
      socket.off("message", onMessage);
    };
    socket.on("message", onMessage);
  });
}

async function connect(url: string): Promise<WebSocket> {
  const socket = new WebSocket(url);
  const connected = nextEvent(socket, "connected");
  await new Promise<void>((resolve, reject) => {
    socket.once("open", resolve);
    socket.once("error", reject);
  });
  await connected;
  return socket;
}

describe("authenticated realtime WebSocket gateway", () => {
  let app: NestFastifyApplication;
  let httpUrl: string;
  let websocketUrl: string;
  let buyerToken: string;
  let unrelatedToken: string;

  async function login(email: string): Promise<string> {
    const response = await fetch(`${httpUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shongre-Client": "native",
      },
      body: JSON.stringify({ email, password: DEMO_ACCOUNT_PASSWORD }),
    });
    expect(response.status).toBe(200);
    return ((await response.json()) as { token: string }).token;
  }

  beforeAll(async () => {
    await seedDemoCredentials();
    app = await createBackendApplication();
    await app.listen(0, "127.0.0.1");
    httpUrl = await app.getUrl();
    websocketUrl = `${httpUrl.replace("http://", "ws://")}/realtime`;
    buyerToken = await login("thomas.laurent@example.fr");
    unrelatedToken = await login("recrutement@technova.fr");
  });

  afterAll(async () => app.close());

  it("authenticates, authorizes, delivers, unsubscribes, and reconnects", async () => {
    const buyer = await connect(websocketUrl);
    const authenticated = nextEvent(buyer, "authenticated");
    buyer.send(
      JSON.stringify({ event: "authenticate", data: { token: buyerToken } }),
    );
    expect((await authenticated).data.userId).toBe("user_thomas");

    const subscribed = nextEvent(buyer, "subscribed");
    buyer.send(
      JSON.stringify({
        event: "subscribe",
        data: { channel: "conversation", resourceId: "conv_1" },
      }),
    );
    await subscribed;

    const delivered = nextEvent(buyer, "new_message");
    await realtimePubSub.publish({
      schemaVersion: 1,
      channelName: "conversation:conv_1",
      event: "new_message",
      payload: { id: "realtime-test-message" },
    });
    expect((await delivered).data.id).toBe("realtime-test-message");

    const unsubscribed = nextEvent(buyer, "unsubscribed");
    buyer.send(
      JSON.stringify({
        event: "unsubscribe",
        data: { channel: "conversation", resourceId: "conv_1" },
      }),
    );
    await unsubscribed;
    let deliveredAfterUnsubscribe = false;
    const unexpectedDelivery = (raw: WebSocket.RawData) => {
      if (JSON.parse(raw.toString()).event === "new_message") {
        deliveredAfterUnsubscribe = true;
      }
    };
    buyer.on("message", unexpectedDelivery);
    await realtimePubSub.publish({
      schemaVersion: 1,
      channelName: "conversation:conv_1",
      event: "new_message",
      payload: { id: "must-not-arrive" },
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    buyer.off("message", unexpectedDelivery);
    expect(deliveredAfterUnsubscribe).toBe(false);
    buyer.close();

    const unrelated = await connect(websocketUrl);
    const unrelatedAuthenticated = nextEvent(unrelated, "authenticated");
    unrelated.send(
      JSON.stringify({
        event: "authenticate",
        data: { token: unrelatedToken },
      }),
    );
    await unrelatedAuthenticated;
    const denied = nextEvent(unrelated, "subscription_error");
    unrelated.send(
      JSON.stringify({
        event: "subscribe",
        data: { channel: "conversation", resourceId: "conv_1" },
      }),
    );
    expect((await denied).data.code).toBe("NOT_FOUND");
    unrelated.close();

    const reconnected = await connect(websocketUrl);
    const reauthenticated = nextEvent(reconnected, "authenticated");
    reconnected.send(
      JSON.stringify({ event: "authenticate", data: { token: buyerToken } }),
    );
    await reauthenticated;
    reconnected.close();
  });

  it("rejects invalid authentication without accepting subscriptions", async () => {
    const socket = await connect(websocketUrl);
    const closed = new Promise<number>((resolve) => {
      socket.once("close", (code) => resolve(code));
    });
    socket.send(
      JSON.stringify({ event: "authenticate", data: { token: "invalid" } }),
    );
    expect(await closed).toBe(4401);
  });
});
