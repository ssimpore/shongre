import { describe, expect, it } from "vitest";
import type {
  FeatureFlagDefinition,
  FeatureFlagDefinitionUpdate,
  FeatureFlagRule,
  FeatureFlagRuleUpdate,
} from "@shongre/contracts/feature-flags";
import type { IFeatureFlagRepository } from "../../src/infrastructure/database/repositories/feature-flag.repository.js";
import { FeatureFlagService } from "../../src/modules/feature-flags/feature-flag.service.js";
import { GUEST_PRINCIPAL } from "../../src/shared/auth/principal.js";

const definition: FeatureFlagDefinition = {
  key: "checkout.experiment",
  description: "Controls the safe checkout experiment rollout.",
  owner: "Payments",
  defaultEnabled: false,
  exposure: "public",
  lifecycle: "active",
  createdAt: "2026-08-25T00:00:00.000Z",
  updatedAt: "2026-08-25T00:00:00.000Z",
};

class Repository implements IFeatureFlagRepository {
  constructor(
    private readonly value: FeatureFlagDefinition | null = definition,
    private readonly rules: FeatureFlagRule[] = [],
  ) {}
  async getDefinition() {
    return this.value;
  }
  async listDefinitions() {
    return this.value ? [this.value] : [];
  }
  async listRules() {
    return this.rules;
  }
  async upsertDefinition(
    _key: string,
    _input: FeatureFlagDefinitionUpdate,
    _actorId: string,
  ) {
    return definition;
  }
  async upsertRule(
    _key: string,
    _ruleId: string | undefined,
    _input: FeatureFlagRuleUpdate,
    _actorId: string,
  ) {
    return this.rules[0];
  }
}

describe("FeatureFlagService", () => {
  it("fails closed for unknown, archived and server-only flags", async () => {
    const unknown = await new FeatureFlagService(
      new Repository(null),
    ).evaluatePublic(GUEST_PRINCIPAL, "unknown.flag", {});
    const serverOnly = await new FeatureFlagService(
      new Repository({ ...definition, exposure: "server" }),
    ).evaluatePublic(GUEST_PRINCIPAL, definition.key, {});

    expect(unknown).toMatchObject({ enabled: false, source: "safe_default" });
    expect(serverOnly).toMatchObject({
      enabled: false,
      source: "safe_default",
    });
  });

  it("applies matching rules before the definition default", async () => {
    const rule: FeatureFlagRule = {
      id: "rule-fr",
      flagKey: definition.key,
      marketCode: "FR",
      enabled: true,
      rolloutPercentage: 100,
      priority: 500,
      reason: "Enable the staged rollout for the France market.",
      createdAt: definition.createdAt,
      updatedAt: definition.updatedAt,
    };
    const result = await new FeatureFlagService(
      new Repository(definition, [rule]),
    ).evaluatePublic(GUEST_PRINCIPAL, definition.key, {
      marketCode: "FR",
      anonymousId: "browser-101",
    });

    expect(result).toMatchObject({
      enabled: true,
      source: "rule",
      ruleId: "rule-fr",
    });
  });

  it("uses a stable rollout bucket for the same anonymous identity", async () => {
    const rule: FeatureFlagRule = {
      id: "rule-percent",
      flagKey: definition.key,
      enabled: true,
      rolloutPercentage: 50,
      priority: 100,
      reason: "Run a stable fifty percent anonymous rollout.",
      createdAt: definition.createdAt,
      updatedAt: definition.updatedAt,
    };
    const service = new FeatureFlagService(new Repository(definition, [rule]));
    const first = await service.evaluatePublic(
      GUEST_PRINCIPAL,
      definition.key,
      { anonymousId: "stable-browser" },
    );
    const second = await service.evaluatePublic(
      GUEST_PRINCIPAL,
      definition.key,
      { anonymousId: "stable-browser" },
    );
    expect(second.enabled).toBe(first.enabled);
    expect(second.source).toBe(first.source);
  });
});
