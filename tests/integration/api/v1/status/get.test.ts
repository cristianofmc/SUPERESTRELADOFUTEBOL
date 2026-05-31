import orchestrator from "#tests/orchestrator";
import session from "#models/session";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

describe("GET /api/v1/status", () => {
  describe("Anonymous user", () => {
    test("should not return complete and valid system status", async () => {
      const { response, body } = await orchestrator.request("/api/v1/status");

      const typedBody = body as {
        updated_at: string;
        database: {
          max_connections: number;
          current_connections: number;
        };
      };

      // HTTP response
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );
      expect(Object.keys(typedBody).length).toBeGreaterThan(0);

      // Data validations
      const parsedUpdatedAt = new Date(typedBody.updated_at);
      expect(parsedUpdatedAt.toString()).not.toBe("Invalid Date");
      expect(typedBody.updated_at).toBe(parsedUpdatedAt.toISOString());

      // Database validations
      expect(typedBody.database).toBeDefined();
      expect(typedBody.database).not.toHaveProperty("version");
      expect(typedBody.database).not.toHaveProperty("environment");
      expect(typedBody.database.max_connections).toBe(100);

      // Database connection
      expect(typedBody.database.current_connections).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Privileged user", () => {
    test("should return complete and valid system status", async () => {
      const createdUser = await orchestrator.createActivatedUser();
      await orchestrator.addFeaturesToUser(createdUser, ["read:status:all"]);
      const sessionObject = await orchestrator.createSession(createdUser.id);

      const { response, body } = await orchestrator.request("/api/v1/status", {
        headers: {
          Cookie: `${session.COOKIE_NAME}=${sessionObject.token}`,
        },
      });

      const typedBody = body as {
        updated_at: string;
        database: {
          server_version: string;
          environment: string;
          max_connections: number;
          current_connections: number;
        };
      };

      // HTTP response
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );
      expect(Object.keys(typedBody).length).toBeGreaterThan(0);

      // Data validations
      const parsedUpdatedAt = new Date(typedBody.updated_at);
      expect(parsedUpdatedAt.toString()).not.toBe("Invalid Date");
      expect(typedBody.updated_at).toBe(parsedUpdatedAt.toISOString());

      // Database validations
      expect(typedBody.database).toBeDefined();
      expect(typedBody.database.server_version).toBe("18.3");
      expect(typedBody.database.environment).toBe("Local");
      expect(typedBody.database.max_connections).toBe(100);

      // Database connection
      expect(typedBody.database.current_connections).toBeGreaterThanOrEqual(1);
    });
  });
});
