import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import type { IUserRepository } from "./user.repository.js";
import { databaseFailure } from "./repository-error.js";

export interface PublisherOrganization {
  id: string;
  ownerUserId: string;
  displayName: string;
  status: "active" | "suspended" | "deleted";
  isVerified: boolean;
}

export interface PublisherBranch {
  id: string;
  organizationId: string;
  name: string;
  status: "active" | "suspended" | "deleted";
}

export interface PublisherMembership {
  organizationId: string;
  userId: string;
  role: "owner" | "admin" | "manager" | "seller" | "support";
  status: "active" | "invited" | "suspended" | "revoked";
  branchIds: string[];
  permissions: string[];
}

export interface IPublisherRepository {
  findOrganization(id: string): Promise<PublisherOrganization | null>;
  findDefaultOrganization(
    userId: string,
  ): Promise<PublisherOrganization | null>;
  findMembership(
    organizationId: string,
    userId: string,
  ): Promise<PublisherMembership | null>;
  findBranch(id: string): Promise<PublisherBranch | null>;
}

export class DemoPublisherRepository implements IPublisherRepository {
  constructor(private readonly users: IUserRepository) {}

  private async organizationForUser(
    userId: string,
  ): Promise<PublisherOrganization | null> {
    const user = await this.users.findById(userId);
    if (!user || user.accountType !== "professional") return null;
    return {
      id: `org_${user.id}`,
      ownerUserId: user.id,
      displayName: user.name,
      status:
        user.status === "active"
          ? "active"
          : user.status === "suspended"
            ? "suspended"
            : "deleted",
      isVerified: Boolean(user.isBusinessVerified || user.isVerified),
    };
  }

  async findOrganization(id: string): Promise<PublisherOrganization | null> {
    if (!id.startsWith("org_")) return null;
    return this.organizationForUser(id.slice(4));
  }

  async findDefaultOrganization(
    userId: string,
  ): Promise<PublisherOrganization | null> {
    return this.organizationForUser(userId);
  }

  async findMembership(
    organizationId: string,
    userId: string,
  ): Promise<PublisherMembership | null> {
    const organization = await this.findOrganization(organizationId);
    if (!organization || organization.ownerUserId !== userId) return null;
    return {
      organizationId,
      userId,
      role: "owner",
      status: "active",
      branchIds: [],
      permissions: ["listing.publish", "listing.manage", "inventory.import"],
    };
  }

  async findBranch(_id: string): Promise<PublisherBranch | null> {
    return null;
  }
}

export class PostgresPublisherRepository implements IPublisherRepository {
  async findOrganization(id: string): Promise<PublisherOrganization | null> {
    const { data, error } = await getSupabaseAdminClient()
      .from("organizations")
      .select("id,owner_id,legal_name,trade_name,is_verified,status")
      .eq("id", id)
      .maybeSingle();
    if (error) databaseFailure("publishers.findOrganization", error);
    if (!data) return null;
    return {
      id: data.id,
      ownerUserId: data.owner_id,
      displayName: data.trade_name || data.legal_name,
      status: data.status,
      isVerified: Boolean(data.is_verified),
    };
  }

  async findDefaultOrganization(
    userId: string,
  ): Promise<PublisherOrganization | null> {
    const client = getSupabaseAdminClient();
    const owned = await client
      .from("organizations")
      .select("id,owner_id,legal_name,trade_name,is_verified,status")
      .eq("owner_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (owned.error)
      databaseFailure("publishers.findDefaultOwnedOrganization", owned.error);
    if (owned.data) {
      return {
        id: owned.data.id,
        ownerUserId: owned.data.owner_id,
        displayName: owned.data.trade_name || owned.data.legal_name,
        status: owned.data.status,
        isVerified: Boolean(owned.data.is_verified),
      };
    }
    const membership = await client
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (membership.error)
      databaseFailure("publishers.findDefaultMembership", membership.error);
    return membership.data?.organization_id
      ? this.findOrganization(membership.data.organization_id)
      : null;
  }

  async findMembership(
    organizationId: string,
    userId: string,
  ): Promise<PublisherMembership | null> {
    const organization = await this.findOrganization(organizationId);
    if (organization?.ownerUserId === userId) {
      return {
        organizationId,
        userId,
        role: "owner",
        status: "active",
        branchIds: [],
        permissions: ["listing.publish", "listing.manage", "inventory.import"],
      };
    }
    const { data, error } = await getSupabaseAdminClient()
      .from("organization_members")
      .select("organization_id,user_id,role,status,branch_ids,permissions")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) databaseFailure("publishers.findMembership", error);
    if (!data) return null;
    return {
      organizationId: data.organization_id,
      userId: data.user_id,
      role: data.role,
      status: data.status,
      branchIds: data.branch_ids || [],
      permissions: data.permissions || [],
    };
  }

  async findBranch(id: string): Promise<PublisherBranch | null> {
    const { data, error } = await getSupabaseAdminClient()
      .from("organization_branches")
      .select("id,organization_id,name,status")
      .eq("id", id)
      .maybeSingle();
    if (error) databaseFailure("publishers.findBranch", error);
    if (!data) return null;
    return {
      id: data.id,
      organizationId: data.organization_id,
      name: data.name,
      status: data.status,
    };
  }
}
