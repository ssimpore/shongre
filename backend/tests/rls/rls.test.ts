import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { hasPermission, PlatformRole } from "../../src/shared/auth/rbac.js";

describe("RLS & Role-Based Access Control Matrix", () => {
  const mobileSafetyMigration = readFileSync(
    new URL(
      "../../supabase/migrations/00009_mobile_safety_and_account_deletion.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const coursesMigration = readFileSync(
    new URL(
      "../../supabase/migrations/00011_courses_vertical.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const autoMigration = readFileSync(
    new URL(
      "../../supabase/migrations/00013_auto_vertical.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const immoMigration = readFileSync(
    new URL(
      "../../supabase/migrations/00014_real_estate_vertical.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const commercialMigration = readFileSync(
    new URL(
      "../../supabase/migrations/00015_business_rules_monetization.sql",
      import.meta.url,
    ),
    "utf8",
  );

  it("allows buyers to read listings and create orders", () => {
    expect(hasPermission("individual_buyer", "listing.read")).toBe(true);
    expect(hasPermission("individual_buyer", "order.create")).toBe(true);
    expect(hasPermission("individual_buyer", "listing.create")).toBe(false);
    expect(hasPermission("individual_buyer", "admin.access")).toBe(false);
  });

  it("allows sellers to publish listings and manage own orders", () => {
    expect(hasPermission("individual_seller", "listing.create")).toBe(true);
    expect(hasPermission("individual_seller", "listing.publish")).toBe(true);
    expect(hasPermission("individual_seller", "order.manage.seller")).toBe(
      true,
    );
    expect(hasPermission("individual_seller", "admin.access")).toBe(false);
  });

  it("allows moderators to review and moderate listings", () => {
    expect(hasPermission("moderator", "listing.moderate")).toBe(true);
    expect(hasPermission("moderator", "report.review")).toBe(true);
    expect(hasPermission("moderator", "user.suspend")).toBe(true);
  });

  it("grants full administrative permissions to admin and super_admin", () => {
    const roles: PlatformRole[] = ["admin", "super_admin"];
    for (const role of roles) {
      expect(hasPermission(role, "admin.access")).toBe(true);
      expect(hasPermission(role, "market.manage")).toBe(true);
      expect(hasPermission(role, "order.refund")).toBe(true);
      expect(hasPermission(role, "user.manage")).toBe(true);
    }
  });

  it("enables RLS for block, push-token, and deletion-audit tables", () => {
    for (const table of [
      "account_deletion_requests",
      "blocked_users",
      "push_device_tokens",
    ]) {
      expect(mobileSafetyMigration).toContain(
        `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`,
      );
    }
  });

  it("limits user-facing block and push-token policies to the authenticated profile", () => {
    expect(mobileSafetyMigration).toContain("p.auth_user_id = auth.uid()");
    expect(mobileSafetyMigration).not.toMatch(
      /CREATE POLICY[^;]+account_deletion_requests/s,
    );
  });

  it("keeps account anonymization atomic and service-role only", () => {
    expect(mobileSafetyMigration).toContain(
      "FUNCTION public.complete_account_deletion",
    );
    expect(mobileSafetyMigration).toContain("SECURITY DEFINER");
    expect(mobileSafetyMigration).toContain(
      "REVOKE ALL ON FUNCTION public.complete_account_deletion",
    );
    expect(mobileSafetyMigration).toContain("TO service_role");
  });

  it("enables RLS on every user, organization, lead, payment, and evidence table for Cours", () => {
    for (const table of [
      "course_tutor_profiles",
      "course_tutor_qualifications",
      "course_qualification_evidence",
      "course_learner_requests",
      "course_leads",
      "course_bookings",
      "course_payment_events",
      "course_organization_members",
    ]) {
      expect(coursesMigration).toContain(
        `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`,
      );
    }
  });

  it("uses a privacy-safe public tutor search view and keeps exact location out of it", () => {
    expect(coursesMigration).toContain(
      "CREATE OR REPLACE VIEW public.course_tutor_search_view",
    );
    expect(coursesMigration).toContain(
      "p.public_payload #>> '{serviceArea,cityLabel}'",
    );
    expect(coursesMigration).toContain(
      "#- '{serviceArea,latitude}' #- '{serviceArea,longitude}'",
    );
    expect(coursesMigration).toContain(
      "- 'userId' - 'availabilityRules' - 'availabilityExceptions'",
    );
    expect(coursesMigration).toContain("o.public_payload - 'moderationReason'");
    expect(coursesMigration).toContain("private_payload JSONB NOT NULL");
    expect(coursesMigration).not.toContain(
      "Approved tutor profiles are public",
    );
    expect(coursesMigration).not.toContain(
      "Published course offers are public",
    );
    expect(coursesMigration).not.toMatch(
      /CREATE OR REPLACE VIEW public\.course_tutor_search_view[\s\S]+center_latitude[\s\S]+GRANT SELECT/,
    );
  });

  it("grants course administration only to market managers and administrators", () => {
    expect(hasPermission("individual_buyer", "course.admin.manage")).toBe(
      false,
    );
    expect(hasPermission("individual_seller", "course.admin.manage")).toBe(
      false,
    );
    expect(hasPermission("market_manager", "course.admin.manage")).toBe(true);
    expect(hasPermission("admin", "course.admin.manage")).toBe(true);
  });

  it("enables RLS on every Auto identity, dealer, lead, import, commerce, provider, and audit table", () => {
    for (const table of [
      "auto_dealer_members",
      "auto_vehicles",
      "auto_vehicle_drafts",
      "auto_vehicle_documents",
      "auto_leads",
      "auto_lead_actions",
      "auto_appointments",
      "auto_stock_transfers",
      "auto_inventory_imports",
      "auto_inventory_import_errors",
      "auto_api_credentials",
      "auto_partner_referrals",
      "auto_subscriptions",
      "auto_add_on_purchases",
      "auto_provider_events",
      "auto_analytics_events",
      "auto_audit_logs",
    ])
      expect(autoMigration).toContain(
        `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`,
      );
  });

  it("keeps Auto base vehicle rows private and exposes only privacy-safe API payloads", () => {
    expect(autoMigration).toContain(
      "Vehicle owners and reviewers read private rows",
    );
    expect(autoMigration).not.toContain("Published Auto vehicles are public");
    expect(autoMigration).toContain(
      "Never store VIN, registration, exact private address, document path or fraud signal here.",
    );
    expect(autoMigration).toContain("auto_vehicles_vin_hash_unique_idx");
    expect(autoMigration).toContain(
      "auto_vehicles_registration_hash_unique_idx",
    );
    expect(autoMigration).toContain("auto_vehicles_description_hash_idx");
    expect(autoMigration).toContain("auto_vehicles_media_hashes_gin_idx");
  });

  it("normalizes indexed Auto buyer filters and idempotent provider/import events", () => {
    for (const column of [
      "body_type",
      "model_year",
      "mileage_value",
      "fuel_type",
      "transmission",
      "seller_type",
      "location_city",
      "warranty_months",
      "financing_available",
      "price_minor",
    ])
      expect(autoMigration).toContain(column);
    expect(autoMigration).toContain(
      "idempotency_key VARCHAR(240) NOT NULL UNIQUE",
    );
    expect(autoMigration).toContain(
      "provider_event_id VARCHAR(240) NOT NULL UNIQUE",
    );
  });

  it("grants Auto administration and dealer operations only to intended roles", () => {
    expect(hasPermission("individual_buyer", "auto.read")).toBe(true);
    expect(hasPermission("individual_seller", "auto.vehicle.manage.own")).toBe(
      true,
    );
    expect(hasPermission("pro_seller", "auto.dealer.manage.own")).toBe(true);
    expect(hasPermission("pro_seller", "auto.lead.manage.own")).toBe(true);
    expect(hasPermission("individual_seller", "auto.admin.manage")).toBe(false);
    expect(hasPermission("market_manager", "auto.admin.manage")).toBe(true);
    expect(hasPermission("admin", "auto.admin.manage")).toBe(true);
  });

  it("enables RLS across Immo private, commercial, CRM and analytics tables", () => {
    for (const table of [
      "vertical_checkouts",
      "vertical_payment_webhook_events",
      "real_estate_agencies",
      "real_estate_agency_members",
      "real_estate_properties",
      "real_estate_private_documents",
      "real_estate_drafts",
      "real_estate_leads",
      "real_estate_lead_notes",
      "real_estate_appointments",
      "real_estate_imports",
      "real_estate_moderation_history",
      "real_estate_analytics_events",
    ])
      expect(immoMigration).toContain(
        `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`,
      );
  });

  it("keeps Immo private rows non-public and authorizes shared drafts through active agency membership", () => {
    expect(immoMigration).not.toContain("Published Immo properties are public");
    expect(immoMigration).toContain("private_storage_key TEXT NOT NULL");
    expect(immoMigration).toContain(
      'CREATE POLICY "Owners and agency members manage Immo drafts"',
    );
    expect(immoMigration).toContain("member.status = 'active'");
    expect(immoMigration).toContain("TO service_role");
  });

  it("grants Immo administration and agency operations only to intended roles", () => {
    expect(hasPermission("individual_buyer", "immo.admin.manage")).toBe(false);
    expect(hasPermission("individual_seller", "immo.admin.manage")).toBe(false);
    expect(hasPermission("pro_seller", "immo.agency.manage.own")).toBe(true);
    expect(hasPermission("market_manager", "immo.admin.manage")).toBe(true);
    expect(hasPermission("admin", "immo.admin.manage")).toBe(true);
  });

  it("keeps every central commercial and financial table deny-by-default", () => {
    for (const table of [
      "commercial_rule_sets",
      "commercial_configuration_versions",
      "commercial_rules",
      "monetization_products",
      "monetization_product_versions",
      "monetization_prices",
      "monetization_product_entitlements",
      "monetization_promotions",
      "monetization_promotion_products",
      "monetization_quotes",
      "monetization_quote_items",
      "monetization_orders",
      "monetization_payment_events",
      "monetization_entitlements",
      "monetization_usage_counters",
      "monetization_subscriptions",
      "monetization_promotion_redemptions",
      "commercial_configuration_approvals",
      "commercial_configuration_audit",
    ]) {
      expect(commercialMigration).toContain(
        `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`,
      );
    }
    expect(commercialMigration).not.toMatch(/CREATE POLICY[^;]+monetization_/s);
  });

  it("makes quotes and audit evidence immutable and server-role only", () => {
    expect(commercialMigration).toContain("CREATE TRIGGER immutable_quote_items");
    expect(commercialMigration).toContain("CREATE TRIGGER immutable_commercial_audit");
    expect(commercialMigration).toContain("REVOKE ALL ON FUNCTION public.process_monetization_stripe_event");
    expect(commercialMigration).toContain("TO service_role");
  });

  it("separates commercial editing, approval, publication, and order-reading permissions", () => {
    expect(hasPermission("commercial", "commercial_rules.edit")).toBe(true);
    expect(hasPermission("commercial", "commercial_rules.approve")).toBe(false);
    expect(hasPermission("finance", "commercial_rules.approve")).toBe(true);
    expect(hasPermission("finance", "commercial_rules.publish")).toBe(false);
    expect(hasPermission("admin", "commercial_rules.publish")).toBe(true);
    expect(hasPermission("individual_seller", "commercial_rules.read")).toBe(false);
  });
});
