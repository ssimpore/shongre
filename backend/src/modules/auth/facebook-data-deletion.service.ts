import { createHmac, timingSafeEqual } from "crypto";
import { config } from "../../app/config/index.js";
import {
  authRepository,
  type IAuthRepository,
} from "../../infrastructure/database/repositories/auth.repository.js";
import { AppError } from "../../shared/errors/app-error.js";
import { randomOAuthValue, sha256 } from "./oauth-provider.client.js";
import { usersService, type UsersService } from "../users/users.service.js";
import { AppError as DomainError } from "../../shared/errors/app-error.js";
import type { ProviderDeletionRequestRecord } from "../../infrastructure/database/repositories/auth.repository.js";

interface FacebookDeletionPayload {
  algorithm?: string;
  issued_at?: number;
  user_id?: string;
}

function invalidRequest(): AppError {
  return new AppError({
    code: "FORBIDDEN",
    message: "Demande de suppression invalide.",
  });
}

function decodeSignedRequest(
  signedRequest: string,
  appSecret: string,
): FacebookDeletionPayload {
  const [encodedSignature, encodedPayload, extra] = (signedRequest || "").split(
    ".",
  );
  if (!encodedSignature || !encodedPayload || extra || !appSecret)
    throw invalidRequest();

  let signature: Buffer;
  let payload: FacebookDeletionPayload;
  try {
    signature = Buffer.from(encodedSignature, "base64url");
    payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as FacebookDeletionPayload;
  } catch {
    throw invalidRequest();
  }

  const expected = createHmac("sha256", appSecret)
    .update(encodedPayload)
    .digest();
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(signature, expected)
  )
    throw invalidRequest();
  if (String(payload.algorithm || "").toUpperCase() !== "HMAC-SHA256")
    throw invalidRequest();
  if (!payload.user_id || payload.user_id.length > 255) throw invalidRequest();
  const now = Math.floor(Date.now() / 1000);
  if (
    typeof payload.issued_at !== "number" ||
    payload.issued_at > now + 300 ||
    payload.issued_at < now - 86_400
  ) {
    throw invalidRequest();
  }
  return payload;
}

export class FacebookDataDeletionService {
  constructor(
    private readonly repository: IAuthRepository = authRepository,
    private readonly appSecret = config.facebookOAuth.clientSecret,
    private readonly statusBaseUrl = new URL(
      `${config.apiPrefix}/auth/oauth/facebook/data-deletion/status`,
      config.facebookOAuth.callbackUrl || "http://localhost:4000",
    ).toString(),
    private readonly accountDeletion: Pick<
      UsersService,
      "deleteFromVerifiedProvider"
    > = usersService,
  ) {}

  async request(
    signedRequest: string,
  ): Promise<{ url: string; confirmation_code: string }> {
    const payload = decodeSignedRequest(signedRequest, this.appSecret);
    const identity = await this.repository.findIdentity(
      "facebook",
      payload.user_id!,
    );
    const confirmationCode = randomOAuthValue(24);
    const record = await this.repository.createProviderDeletionRequest({
      provider: "facebook",
      providerSubject: payload.user_id!,
      userId: identity?.userId || null,
      confirmationCodeHash: sha256(confirmationCode),
    });
    await this.repository.recordSecurityEvent({
      userId: identity?.userId || null,
      eventType: "account_deletion_requested",
      provider: "facebook",
      metadata: { requestId: record.id },
    });
    await this.processRecord(record);
    const statusUrl = new URL(this.statusBaseUrl);
    statusUrl.searchParams.set("code", confirmationCode);
    return { url: statusUrl.toString(), confirmation_code: confirmationCode };
  }

  async status(
    confirmationCode: string,
  ): Promise<{ status: "queued" | "completed" | "rejected" }> {
    const request = confirmationCode
      ? await this.repository.findProviderDeletionRequest(
          sha256(confirmationCode),
        )
      : null;
    if (!request)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Demande introuvable.",
      });
    return { status: request.status };
  }

  async processQueued(
    limit = 50,
  ): Promise<{ completed: number; pending: number }> {
    const records =
      await this.repository.listQueuedProviderDeletionRequests(limit);
    let completed = 0;
    for (const record of records) {
      if (await this.processRecord(record)) completed += 1;
    }
    return { completed, pending: records.length - completed };
  }

  private async processRecord(
    record: ProviderDeletionRequestRecord,
  ): Promise<boolean> {
    if (!record.userId) {
      await this.repository.updateProviderDeletionRequest(
        record.id,
        "completed",
      );
      return true;
    }
    try {
      await this.accountDeletion.deleteFromVerifiedProvider(
        record.userId,
        record.provider,
        record.providerSubject,
      );
      await this.repository.updateProviderDeletionRequest(
        record.id,
        "completed",
      );
      return true;
    } catch (error) {
      if (error instanceof DomainError && error.code === "NOT_FOUND") {
        // No identity/account means no provider-derived personal data remains.
        await this.repository.updateProviderDeletionRequest(
          record.id,
          "completed",
        );
        return true;
      }
      // Active transactions and suspended accounts require the normal support
      // workflow. Keep the verified request queued instead of losing it.
      if (error instanceof DomainError && error.code === "CONFLICT")
        return false;
      throw error;
    }
  }
}

export const facebookDataDeletionService = new FacebookDataDeletionService();
