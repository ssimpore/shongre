import type { RiskLevel, VerificationDimension } from "@shongre/contracts/compliance";

export interface RiskSignals {
  unusualLogin?: boolean;
  highVelocity?: boolean;
  duplicateAccount?: boolean;
  paymentAnomaly?: boolean;
  chargebackHistory?: boolean;
  fraudReports?: number;
  deviceAnomaly?: boolean;
}

export interface RiskDecision {
  level: RiskLevel;
  reasonCodes: string[];
  recommendedChecks: VerificationDimension[];
  requiresHumanReview: boolean;
}

/** Risk suggests proportionate step-up checks; it never changes legal rules. */
export class RiskEngine {
  evaluate(signals: RiskSignals): RiskDecision {
    const reasons: string[] = [];
    let weight = 0;
    const add = (active: boolean | undefined, value: number, code: string) => {
      if (!active) return;
      weight += value;
      reasons.push(code);
    };
    add(signals.unusualLogin, 1, "UNUSUAL_LOGIN");
    add(signals.highVelocity, 2, "HIGH_VELOCITY");
    add(signals.duplicateAccount, 3, "DUPLICATE_ACCOUNT_SIGNAL");
    add(signals.paymentAnomaly, 3, "PAYMENT_ANOMALY");
    add(signals.chargebackHistory, 3, "CHARGEBACK_HISTORY");
    add(signals.deviceAnomaly, 1, "DEVICE_ANOMALY");
    if ((signals.fraudReports ?? 0) > 0) {
      weight += Math.min(3, signals.fraudReports ?? 0);
      reasons.push("FRAUD_REPORTS");
    }

    const level: RiskLevel =
      weight >= 7 ? "CRITICAL" : weight >= 4 ? "HIGH" : weight >= 2 ? "ELEVATED" : "NORMAL";
    return {
      level,
      reasonCodes: reasons,
      recommendedChecks:
        level === "NORMAL"
          ? []
          : level === "ELEVATED"
            ? ["phone"]
            : ["phone", "enhanced_review"],
      requiresHumanReview: level === "HIGH" || level === "CRITICAL",
    };
  }
}

export const riskEngine = new RiskEngine();
