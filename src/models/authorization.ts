import { InternalServerError } from "#infra/errors";
import type { AuthUser } from "#infra/middlewares/authenticate";
import type { users, sessions } from "#db/schema";

// ─── Internal DB Types ────────────────────────────────────────────────────────

type DbUser = typeof users.$inferSelect;
type DbSession = typeof sessions.$inferSelect;

// ─── Feature Set ─────────────────────────────────────────────────────────────

const availableFeatures = new Set([
  // USER
  "create:user",
  "read:user",
  "read:user:self",
  "update:user",
  "update:user:others",
  // SESSION
  "create:session",
  "read:session",
  // ACTIVATION_TOKEN
  "read:activation_token",
  // MIGRATION
  "create:migration",
  "read:migration",
  // STATUS
  "read:status",
  "read:status:all",
] as const);

export type Feature = typeof availableFeatures extends Set<infer F> ? F : never;

// ─── can ──────────────────────────────────────────────────────────────────────

function can(
  user: AuthUser,
  feature: Feature,
  resource?: { id: string },
): boolean {
  validateUser(user);
  validateFeature(feature);

  let authorized = false;

  if (user.features.includes(feature)) {
    authorized = true;
  }

  if (feature === "update:user" && resource) {
    authorized = false;
    if (user.id === resource.id || can(user, "update:user:others")) {
      authorized = true;
    }
  }

  return authorized;
}

// ─── filterOutput ─────────────────────────────────────────────────────────────

function filterOutput(
  user: AuthUser,
  feature: Feature,
  resource: unknown,
): unknown {
  validateUser(user);
  validateFeature(feature);
  validateResource(resource);

  if (feature === "read:user") {
    const r = resource as DbUser;
    return {
      id: r.id,
      username: r.username,
      features: r.features,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    };
  }

  if (feature === "read:user:self") {
    const r = resource as DbUser;
    if (user.id === r.id) {
      return {
        id: r.id,
        username: r.username,
        email: r.email,
        features: r.features,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
      };
    }
  }

  if (feature === "read:session") {
    const r = resource as DbSession;
    if (user.id === r.userId) {
      return {
        id: r.id,
        token: r.token,
        user_id: r.userId,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
        expires_at: r.expiresAt,
      };
    }
  }

  if (feature === "read:activation_token") {
    const r = resource as DbActivationToken;
    return {
      id: r.id,
      user_id: r.userId,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
      expires_at: r.expiresAt,
      used_at: r.usedAt,
    };
  }

  if (feature === "read:migration") {
    const migrations = resource as DbMigration[];
    return migrations.map((migration) => ({
      path: migration.path,
      name: migration.name,
      timestamp: migration.timestamp,
    }));
  }

  if (feature === "read:status") {
    const r = resource as DbStatus;
    const output = {
      updated_at: r.updatedAt,
      database: {
        max_connections: r.database.maxConnections,
        current_connections: r.database.currentConnections,
        server_version: undefined as string | undefined,
        environment: undefined as string | undefined,
      },
    };
    if (can(user, "read:status:all")) {
      output.database.server_version = r.database.serverVersion;
      output.database.environment = r.database.environment;
    }
    return output;
  }
}

// ─── Temporary interfaces for tables not yet on Drizzle ──────────────────────
// Replace with typeof <table>.$inferSelect when schemas are added.

interface DbActivationToken {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
}

interface DbMigration {
  path: string;
  name: string;
  timestamp: number;
}

interface DbStatus {
  updatedAt: Date;
  database: {
    maxConnections: number;
    currentConnections: number;
    serverVersion?: string;
    environment?: string;
  };
}

// ─── Validators ───────────────────────────────────────────────────────────────

function validateUser(user: unknown): asserts user is AuthUser {
  if (!user || typeof user !== "object" || !("features" in user)) {
    throw new InternalServerError({
      cause: "It is necessary to provide a `user` in the authorization module.",
    });
  }
}

function validateFeature(feature: unknown): asserts feature is Feature {
  if (!feature || !availableFeatures.has(feature as Feature)) {
    throw new InternalServerError({
      cause:
        "It is necessary to provide a valid `feature` in the authorization module.",
    });
  }
}

function validateResource(resource: unknown): asserts resource is object {
  if (!resource) {
    throw new InternalServerError({
      cause:
        "It is necessary to provide a valid `resource` in the authorization.filterOutput().",
    });
  }
}

const authorization = { can, filterOutput };
export default authorization;
