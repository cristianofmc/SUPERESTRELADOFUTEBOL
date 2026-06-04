import { InternalServerError } from "#infra/errors";
import authorization from "#models/authorization";
import type { AuthUser } from "#infra/middlewares/authenticate";

const makeUser = (features: string[]): AuthUser =>
  ({ id: "user-1", features }) as AuthUser;

describe("models/authorization.ts", () => {
  describe(".can()", () => {
    test("throws when user is invalid", () => {
      expect(() => {
        // @ts-expect-error testing invalid runtime input
        authorization.can(null, "read:user");
      }).toThrow(InternalServerError);
    });

    test("throws when feature is unknown", () => {
      expect(() => {
        // @ts-expect-error testing invalid runtime input
        authorization.can(makeUser([]), "unknown:feature");
      }).toThrow(InternalServerError);
    });

    test("returns false when user does not have the feature", () => {
      expect(authorization.can(makeUser([]), "read:user")).toBe(false);
    });

    test("returns true when user has the feature", () => {
      expect(authorization.can(makeUser(["read:user"]), "read:user")).toBe(
        true,
      );
    });

    test("returns true when updating own resource", () => {
      const user: AuthUser = {
        id: "user-1",
        features: ["update:user"],
      } as AuthUser;
      const resource = { id: "user-1" };
      expect(authorization.can(user, "update:user", resource)).toBe(true);
    });

    test("returns false when updating another user without elevated feature", () => {
      const user: AuthUser = {
        id: "user-1",
        features: ["update:user"],
      } as AuthUser;
      const resource = { id: "user-2" };
      expect(authorization.can(user, "update:user", resource)).toBe(false);
    });

    test("returns true when updating another user with elevated feature", () => {
      const user: AuthUser = {
        id: "user-1",
        features: ["update:user", "update:user:others"],
      } as AuthUser;
      const resource = { id: "user-2" };
      expect(authorization.can(user, "update:user", resource)).toBe(true);
    });
  });

  describe(".filterOutput()", () => {
    test("throws when user is invalid", () => {
      expect(() => {
        // @ts-expect-error testing invalid runtime input
        authorization.filterOutput(null, "read:user", {});
      }).toThrow(InternalServerError);
    });

    test("throws when resource is missing", () => {
      expect(() => {
        authorization.filterOutput(makeUser(["read:user"]), "read:user", null);
      }).toThrow(InternalServerError);
    });

    test("returns only public fields for read:user", () => {
      const resource = {
        id: "1",
        username: "resource",
        features: ["read:user"],
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        email: "resource@resource.com",
        password: "secret",
      };

      const result = authorization.filterOutput(
        makeUser(["read:user"]),
        "read:user",
        resource,
      );

      expect(result).toEqual({
        id: "1",
        username: "resource",
        features: ["read:user"],
        created_at: new Date("2026-01-01T00:00:00.000Z"),
        updated_at: new Date("2026-01-01T00:00:00.000Z"),
      });

      expect(result).not.toHaveProperty("email");
      expect(result).not.toHaveProperty("password");
    });
  });
});
