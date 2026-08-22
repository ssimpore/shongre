export type NativeAuthCallback =
  | { kind: "exchange"; code: string }
  | { kind: "email_required"; completionHandle: string }
  | { kind: "cancelled" }
  | { kind: "invalid" };

export function parseNativeAuthCallback(url: string | null): NativeAuthCallback | null {
  if (!url || !url.startsWith("shongre://auth/callback")) return null;
  const parameters = new URLSearchParams(url.split("#")[1] || "");
  const exchange = parameters.get("exchange");
  if (parameters.get("status") === "success" && exchange) return { kind: "exchange", code: exchange };
  const completionHandle = parameters.get("completion");
  if (parameters.get("status") === "email_required" && completionHandle) {
    return { kind: "email_required", completionHandle };
  }
  if (parameters.get("status") === "cancelled") return { kind: "cancelled" };
  return { kind: "invalid" };
}
