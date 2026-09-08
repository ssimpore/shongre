import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
  clear: vi.fn(),
}));

vi.mock("@/api/http-client", () => ({
  apiRequest: mocks.apiRequest,
  sessionStorage: {
    read: mocks.read,
    write: mocks.write,
    clear: mocks.clear,
  },
  isMobileApiError: (error: unknown) =>
    Boolean(error && typeof error === "object" && "status" in error),
}));

import { HttpAuthService } from "@/features/auth/auth.service";

const user = {
  id: "account-a",
  email: "account@example.test",
  name: "Alex",
  role: "individual_buyer",
  accountType: "individual",
};

describe("API-backed mobile authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.read.mockResolvedValue(null);
  });

  it("obtains and stores a bearer session only from the login API", async () => {
    const session = {
      token: "access-token",
      refreshToken: "refresh-token",
      user,
    };
    mocks.apiRequest.mockResolvedValueOnce(session);

    await expect(
      new HttpAuthService().login({
        email: "account@example.test",
        password: "correct-password",
      }),
    ).resolves.toEqual({ kind: "authenticated", user });
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      "/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "account@example.test",
          password: "correct-password",
        }),
        headers: expect.any(Headers),
      }),
      undefined,
    );
    expect(mocks.write).toHaveBeenCalledWith(session);
  });

  it("keeps an MFA challenge in memory and stores only the confirmed session", async () => {
    const challenge = {
      requiresMfa: true,
      tempMfaToken: "one-time-challenge",
      expiresAt: "2026-09-07T08:00:00.000Z",
    };
    const session = {
      token: "access-token",
      refreshToken: "refresh-token",
      user,
    };
    mocks.apiRequest
      .mockResolvedValueOnce(challenge)
      .mockResolvedValueOnce(session);
    const service = new HttpAuthService();

    await expect(
      service.login({
        email: "account@example.test",
        password: "correct-password",
      }),
    ).resolves.toEqual({
      kind: "mfa_required",
      tempMfaToken: "one-time-challenge",
      expiresAt: challenge.expiresAt,
    });
    expect(mocks.write).not.toHaveBeenCalled();

    await expect(
      service.completeMfa("one-time-challenge", "123456"),
    ).resolves.toEqual(user);
    expect(mocks.apiRequest).toHaveBeenLastCalledWith(
      "/auth/mfa/challenge",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          tempMfaToken: "one-time-challenge",
          code: "123456",
        }),
        headers: expect.any(Headers),
      }),
      undefined,
    );
    expect(mocks.write).toHaveBeenCalledWith(session);
  });

  it("preserves a stored session when restore fails offline", async () => {
    mocks.read.mockResolvedValueOnce({ token: "access-token", user });
    mocks.apiRequest.mockRejectedValueOnce({
      status: 0,
      code: "NETWORK_ERROR",
    });

    await expect(new HttpAuthService().restore()).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
    expect(mocks.clear).not.toHaveBeenCalled();
  });

  it("clears an expired stored session after an unauthorized restore", async () => {
    mocks.read.mockResolvedValueOnce({ token: "expired", user });
    mocks.apiRequest.mockRejectedValueOnce({
      status: 401,
      code: "UNAUTHORIZED",
    });

    await expect(new HttpAuthService().restore()).resolves.toBeNull();
    expect(mocks.clear).toHaveBeenCalledOnce();
  });

  it("clears local credentials even when remote logout is unavailable", async () => {
    mocks.apiRequest.mockRejectedValueOnce(new Error("offline"));

    await expect(new HttpAuthService().logout()).rejects.toThrow("offline");
    expect(mocks.clear).toHaveBeenCalledOnce();
  });
});
