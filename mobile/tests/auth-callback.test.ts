import { describe, expect, it } from "vitest";
import { parseNativeAuthCallback } from "@/features/auth/native-callback";

describe("native OAuth callback", () => {
  it("accepts only the fixed app callback and reads one-time values from the fragment", () => {
    expect(parseNativeAuthCallback("https://attacker.example/#status=success&exchange=stolen")).toBeNull();
    expect(parseNativeAuthCallback("shongre://auth/callback#status=success&exchange=one-time-code")).toEqual({
      kind: "exchange",
      code: "one-time-code",
    });
  });

  it("surfaces denied email and cancellation without authenticating", () => {
    expect(parseNativeAuthCallback("shongre://auth/callback#status=email_required&completion=pending-code")).toEqual({
      kind: "email_required",
      completionHandle: "pending-code",
    });
    expect(parseNativeAuthCallback("shongre://auth/callback#status=cancelled")).toEqual({ kind: "cancelled" });
    expect(parseNativeAuthCallback("shongre://auth/callback#status=success")).toEqual({ kind: "invalid" });
  });
});
