import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  AiGateway,
  AiGenerationRequest,
  AiGenerationResult,
  EmailDeliveryCapabilities,
  EmailDeliveryGateway,
  EmailDeliveryRequest,
  NormalizedEmailDeliveryEvent,
  ProviderInvocationContext,
} from "@shongre/contracts/provider-gateways";
import { getSupabaseAdminClient } from "../../../infrastructure/supabase/supabase-client.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { assertSafeProviderUrl } from "../safe-provider-url.js";

interface RuntimeConnection {
  providerId: string;
  configuration: Record<string, unknown>;
  credential: { apiKey: string; webhookSecret?: string };
}

function providerFailure(
  message = "Le fournisseur externe a refusé la requête.",
): never {
  throw new AppError({ code: "NETWORK_ERROR", statusCode: 503, message });
}

async function runtimeConnection(
  context: ProviderInvocationContext,
): Promise<RuntimeConnection> {
  const client: any = getSupabaseAdminClient();
  const { data, error } = await client
    .from("provider_connections")
    .select("provider_id,configuration,status,tenant_id,owner_type")
    .eq("id", context.connectionId)
    .maybeSingle();
  if (
    error ||
    !data ||
    data.status !== "ACTIVE" ||
    data.provider_id !== context.providerId ||
    (data.owner_type !== "PLATFORM" && data.tenant_id !== context.tenantId)
  )
    providerFailure("La connexion fournisseur n’est plus active.");
  const { providerCredentialVault } =
    await import("../../../modules/providers/provider-connection.service.js");
  const material = await providerCredentialVault.getCredentialMaterial(
    context.tenantId,
    context.connectionId,
  );
  if (material.kind !== "secret")
    providerFailure(
      "La référence de secret nécessite un gestionnaire de secrets externe.",
    );
  let credential: RuntimeConnection["credential"];
  try {
    const parsed = JSON.parse(material.value);
    credential = {
      apiKey: String(parsed.apiKey || parsed.token || ""),
      webhookSecret: parsed.webhookSecret
        ? String(parsed.webhookSecret)
        : undefined,
    };
  } catch {
    credential = { apiKey: material.value };
  }
  if (!credential.apiKey)
    providerFailure("Le credential fournisseur est vide.");
  return {
    providerId: data.provider_id,
    configuration: data.configuration ?? {},
    credential,
  };
}

async function fetchJson(url: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!response.ok) providerFailure();
  return { response, body };
}

function messageId(response: Response, body: any) {
  return String(
    body?.id ||
      body?.MessageID ||
      body?.messageId ||
      body?.Messages?.[0]?.To?.[0]?.MessageID ||
      response.headers.get("x-message-id") ||
      response.headers.get("x-request-id") ||
      "",
  );
}

function providerCapabilities(providerId: string): EmailDeliveryCapabilities {
  const webhooks =
    providerId === "smtp"
      ? []
      : [
          "ACCEPTED",
          "DELIVERED",
          "DEFERRED",
          "BOUNCED_SOFT",
          "BOUNCED_HARD",
          "COMPLAINT",
          "OPENED",
          "CLICKED",
          "UNSUBSCRIBED",
        ];
  return {
    batch:
      providerId === "brevo" ||
      providerId === "mailjet" ||
      providerId === "sendgrid",
    providerTemplates: ["brevo", "sendgrid", "postmark"].includes(providerId),
    customHeaders: true,
    webhookEvents: webhooks,
    maxBatchSize: providerId === "amazon_ses" ? 50 : 100,
  };
}

function eventType(value: string): NormalizedEmailDeliveryEvent["type"] | null {
  const normalized = value.toLowerCase().replace(/[ .-]/g, "_");
  if (["accepted", "processed", "sent", "injection"].includes(normalized))
    return "ACCEPTED";
  if (["delivered", "delivery"].includes(normalized)) return "DELIVERED";
  if (
    ["deferred", "soft_bounce", "softbounce", "temporary_failure"].includes(
      normalized,
    )
  )
    return "DEFERRED";
  if (
    ["bounce", "bounced", "hard_bounce", "hardbounce", "invalid"].includes(
      normalized,
    )
  )
    return "BOUNCED_HARD";
  if (["spamreport", "complaint", "spam_complaint"].includes(normalized))
    return "COMPLAINT";
  if (["open", "opened"].includes(normalized)) return "OPENED";
  if (["click", "clicked"].includes(normalized)) return "CLICKED";
  if (["unsubscribe", "unsubscribed"].includes(normalized))
    return "UNSUBSCRIBED";
  return null;
}

function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
) {
  const entry = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === name.toLowerCase(),
  )?.[1];
  return Array.isArray(entry) ? entry[0] : entry;
}

export function verifyMarketingProviderWebhookSignature(
  raw: string,
  headers: Record<string, string | string[] | undefined>,
  input: {
    secret?: string;
    signatureHeader?: string;
    timestampHeader?: string;
    nowMs?: number;
  },
) {
  const secret = input.secret;
  if (!secret)
    providerFailure("Le secret de signature webhook n’est pas configuré.");
  const signatureHeader = input.signatureHeader || "x-shongre-signature";
  const timestampHeader = input.timestampHeader || "x-shongre-timestamp";
  const signature = String(headerValue(headers, signatureHeader) || "").replace(
    /^sha256=/,
    "",
  );
  const timestamp = String(headerValue(headers, timestampHeader) || "");
  if (
    !signature ||
    !timestamp ||
    Math.abs((input.nowMs ?? Date.now()) - Number(timestamp) * 1000) > 300_000
  )
    providerFailure("Signature de webhook invalide ou expirée.");
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${raw}`)
    .digest("hex");
  const left = Buffer.from(signature, "hex");
  const right = Buffer.from(expected, "hex");
  if (left.length !== right.length || !timingSafeEqual(left, right))
    providerFailure("Signature de webhook invalide ou expirée.");
}

export class RemoteEmailDeliveryGateway implements EmailDeliveryGateway {
  async testConnection(context: ProviderInvocationContext) {
    const connection = await runtimeConnection(context);
    const endpoints: Record<string, string> = {
      resend: "https://api.resend.com/domains",
      brevo: "https://api.brevo.com/v3/account",
      sendgrid: "https://api.sendgrid.com/v3/scopes",
      postmark: "https://api.postmarkapp.com/server",
    };
    const endpoint = endpoints[connection.providerId];
    if (!endpoint)
      return {
        status: "DEGRADED" as const,
        checkedAt: new Date().toISOString(),
        message: "La connexion sera validée lors du prochain envoi signé.",
      };
    const headers: Record<string, string> =
      connection.providerId === "brevo"
        ? { "api-key": connection.credential.apiKey }
        : connection.providerId === "postmark"
          ? { "X-Postmark-Server-Token": connection.credential.apiKey }
          : { Authorization: `Bearer ${connection.credential.apiKey}` };
    try {
      await fetchJson(endpoint, { method: "GET", headers });
      return {
        status: "HEALTHY" as const,
        checkedAt: new Date().toISOString(),
      };
    } catch {
      return {
        status: "UNAVAILABLE" as const,
        checkedAt: new Date().toISOString(),
        message: "Le fournisseur n’a pas validé la connexion.",
      };
    }
  }

  async getCapabilities(context: ProviderInvocationContext) {
    return providerCapabilities((await runtimeConnection(context)).providerId);
  }

  async send(
    context: ProviderInvocationContext,
    request: EmailDeliveryRequest,
  ) {
    const connection = await runtimeConnection(context);
    const fromEmail = request.from?.email;
    if (!fromEmail)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Une adresse d’expéditeur est requise.",
      });
    const commonHeaders = request.headers ?? {};
    let endpoint = "";
    let headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    let body: unknown;
    switch (connection.providerId) {
      case "resend":
        endpoint = "https://api.resend.com/emails";
        headers.Authorization = `Bearer ${connection.credential.apiKey}`;
        body = {
          from: request.from?.name
            ? `${request.from.name} <${fromEmail}>`
            : fromEmail,
          to: request.to,
          subject: request.subject,
          text: request.textBody,
          html: request.htmlBody,
          reply_to: request.replyTo,
          headers: commonHeaders,
        };
        break;
      case "brevo":
        endpoint = "https://api.brevo.com/v3/smtp/email";
        headers["api-key"] = connection.credential.apiKey;
        body = {
          sender: { email: fromEmail, name: request.from?.name },
          to: request.to.map((email) => ({ email })),
          subject: request.subject,
          textContent: request.textBody,
          htmlContent: request.htmlBody,
          replyTo: request.replyTo ? { email: request.replyTo } : undefined,
          headers: commonHeaders,
        };
        break;
      case "sendgrid":
        endpoint = "https://api.sendgrid.com/v3/mail/send";
        headers.Authorization = `Bearer ${connection.credential.apiKey}`;
        body = {
          personalizations: [
            {
              to: request.to.map((email) => ({ email })),
              headers: commonHeaders,
            },
          ],
          from: { email: fromEmail, name: request.from?.name },
          reply_to: request.replyTo ? { email: request.replyTo } : undefined,
          subject: request.subject,
          content: [
            { type: "text/plain", value: request.textBody },
            ...(request.htmlBody
              ? [{ type: "text/html", value: request.htmlBody }]
              : []),
          ],
        };
        break;
      case "mailjet": {
        endpoint = "https://api.mailjet.com/v3.1/send";
        headers.Authorization = `Basic ${Buffer.from(connection.credential.apiKey).toString("base64")}`;
        body = {
          Messages: [
            {
              From: { Email: fromEmail, Name: request.from?.name },
              To: request.to.map((Email) => ({ Email })),
              Subject: request.subject,
              TextPart: request.textBody,
              HTMLPart: request.htmlBody,
              ReplyTo: request.replyTo ? { Email: request.replyTo } : undefined,
              Headers: commonHeaders,
            },
          ],
        };
        break;
      }
      case "mailgun": {
        const domain = String(connection.configuration.domain || "");
        if (!domain) providerFailure("Le domaine Mailgun n’est pas configuré.");
        endpoint = `https://api.mailgun.net/v3/${encodeURIComponent(domain)}/messages`;
        headers = {
          Authorization: `Basic ${Buffer.from(`api:${connection.credential.apiKey}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        };
        const form = new URLSearchParams({
          from: request.from?.name
            ? `${request.from.name} <${fromEmail}>`
            : fromEmail,
          to: request.to.join(","),
          subject: request.subject,
          text: request.textBody,
        });
        if (request.htmlBody) form.set("html", request.htmlBody);
        if (request.replyTo) form.set("h:Reply-To", request.replyTo);
        Object.entries(commonHeaders).forEach(([key, value]) =>
          form.set(`h:${key}`, value),
        );
        body = form.toString();
        break;
      }
      case "postmark":
        endpoint = "https://api.postmarkapp.com/email";
        headers["X-Postmark-Server-Token"] = connection.credential.apiKey;
        body = {
          From: request.from?.name
            ? `${request.from.name} <${fromEmail}>`
            : fromEmail,
          To: request.to.join(","),
          ReplyTo: request.replyTo,
          Subject: request.subject,
          TextBody: request.textBody,
          HtmlBody: request.htmlBody,
          Headers: Object.entries(commonHeaders).map(([Name, Value]) => ({
            Name,
            Value,
          })),
        };
        break;
      default:
        providerFailure(
          "Cet adaptateur Email Delivery n’est pas encore disponible dans ce runtime.",
        );
    }
    const result = await fetchJson(endpoint, {
      method: "POST",
      headers: { ...headers, "Idempotency-Key": request.idempotencyKey },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
    const externalMessageId = messageId(result.response, result.body);
    if (!externalMessageId)
      providerFailure(
        "Le fournisseur n’a pas retourné d’identifiant de message.",
      );
    return { externalMessageId, acceptedAt: new Date().toISOString() };
  }

  async normalizeWebhook(
    context: ProviderInvocationContext,
    payload: any,
    headers: Record<string, string | string[] | undefined>,
  ) {
    const connection = await runtimeConnection(context);
    const raw = String(payload?.rawBody || "");
    verifyMarketingProviderWebhookSignature(raw, headers, {
      secret: connection.credential.webhookSecret,
      signatureHeader: String(
        connection.configuration.webhookSignatureHeader ||
          "x-shongre-signature",
      ),
      timestampHeader: String(
        connection.configuration.webhookTimestampHeader ||
          "x-shongre-timestamp",
      ),
    });
    const source = payload?.body;
    const items = Array.isArray(source)
      ? source
      : Array.isArray(source?.events)
        ? source.events
        : [source];
    return items
      .slice(0, 1_000)
      .flatMap((item: any): NormalizedEmailDeliveryEvent[] => {
        const data = item?.data ?? item?.["event-data"] ?? item;
        const type = eventType(
          String(
            item?.type || item?.event || item?.RecordType || data?.event || "",
          ),
        );
        const externalMessageId = String(
          data?.email_id ||
            data?.sg_message_id ||
            data?.["message-id"] ||
            data?.MessageID ||
            data?.message?.headers?.["message-id"] ||
            "",
        ).split(".")[0];
        const providerEventId = String(
          data?.sg_event_id ||
            data?.event_id ||
            data?.ID ||
            item?.id ||
            `${externalMessageId}:${type}:${data?.timestamp || data?.occurred_at || ""}`,
        );
        if (!type || !externalMessageId || !providerEventId) return [];
        const occurred = data?.timestamp
          ? new Date(Number(data.timestamp) * 1000).toISOString()
          : String(data?.occurred_at || data?.date || new Date().toISOString());
        return [
          {
            providerEventId,
            externalMessageId,
            type,
            occurredAt: occurred,
            recipient: data?.email || data?.recipient || data?.to?.[0],
            reason: data?.reason || data?.description,
          },
        ];
      });
  }
}

function extractText(body: any) {
  if (typeof body?.output_text === "string") return body.output_text;
  if (Array.isArray(body?.output))
    return body.output
      .flatMap((item: any) => item.content ?? [])
      .map((item: any) => item.text ?? "")
      .join("\n");
  if (typeof body?.choices?.[0]?.message?.content === "string")
    return body.choices[0].message.content;
  if (Array.isArray(body?.content))
    return body.content.map((item: any) => item.text ?? "").join("\n");
  return "";
}

export class RemoteGenerativeAiGateway implements AiGateway {
  async generate(
    context: ProviderInvocationContext,
    request: AiGenerationRequest,
  ): Promise<AiGenerationResult> {
    const connection = await runtimeConnection(context);
    const model = String(
      connection.configuration.model ||
        (connection.providerId === "anthropic"
          ? "claude-sonnet-4-5"
          : "gpt-5-mini"),
    );
    let endpoint: string;
    let headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    let body: unknown;
    const prompt = `${request.instructions}\n\nSafe context:\n${JSON.stringify(request.safeContext)}`;
    if (connection.providerId === "anthropic") {
      endpoint = "https://api.anthropic.com/v1/messages";
      headers["x-api-key"] = connection.credential.apiKey;
      headers["anthropic-version"] = "2023-06-01";
      body = {
        model,
        max_tokens: request.maxOutputTokens,
        messages: [{ role: "user", content: prompt }],
      };
    } else {
      const configuredBase = String(
        connection.configuration.baseUrl || "",
      ).replace(/\/$/, "");
      const base =
        connection.providerId === "openai_compatible"
          ? configuredBase
          : "https://api.openai.com";
      if (!base)
        providerFailure("L’endpoint OpenAI-compatible n’est pas configuré.");
      if (connection.providerId === "openai_compatible")
        await assertSafeProviderUrl(base);
      endpoint =
        connection.providerId === "openai"
          ? `${base}/v1/responses`
          : `${base}/v1/chat/completions`;
      headers.Authorization = `Bearer ${connection.credential.apiKey}`;
      body =
        connection.providerId === "openai"
          ? { model, input: prompt, max_output_tokens: request.maxOutputTokens }
          : {
              model,
              messages: [{ role: "user", content: prompt }],
              max_tokens: request.maxOutputTokens,
            };
    }
    const result = await fetchJson(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const text = extractText(result.body);
    if (!text)
      providerFailure(
        "Le fournisseur IA n’a retourné aucun contenu exploitable.",
      );
    let structuredOutput: Record<string, unknown> | undefined;
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
        structuredOutput = parsed;
    } catch {
      structuredOutput = undefined;
    }
    return {
      text,
      structuredOutput,
      model,
      inputUnits:
        result.body?.usage?.input_tokens ?? result.body?.usage?.prompt_tokens,
      outputUnits:
        result.body?.usage?.output_tokens ??
        result.body?.usage?.completion_tokens,
      providerRequestId: result.body?.id,
    };
  }
}
