import orchestrator from "#tests/orchestrator";
import session from "#models/session";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/migrations", () => {
  describe("Anonymous user", () => {
    test("should not run pending migrations", async () => {
      const { response, body } = await orchestrator.request(
        "/api/v1/migrations",
        {
          method: "POST",
        },
      );

      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );
      expect(response.status).toBe(403);
      expect(body).toEqual({
        name: "ForbiddenError",
        message: "You do not have permission to perform this action.",
        action:
          "Please verify that your user has the 'create:migration' feature.",
        status_code: 403,
      });
    });
  });

  describe("Default user", () => {
    test("should not run pending migrations", async () => {
      const createdUser = await orchestrator.createActivatedUser();
      const sessionObject = await orchestrator.createSession(createdUser.id);

      const { response, body } = await orchestrator.request(
        "/api/v1/migrations",
        {
          method: "POST",
          headers: {
            Cookie: `${session.COOKIE_NAME}=${sessionObject.token}`,
          },
        },
      );

      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );
      expect(response.status).toBe(403);
      expect(body).toEqual({
        name: "ForbiddenError",
        message: "You do not have permission to perform this action.",
        action:
          "Please verify that your user has the 'create:migration' feature.",
        status_code: 403,
      });
    });
  });

  describe("Privileged user", () => {
    test("should not run pending migrations", async () => {
      const createdUser = await orchestrator.createActivatedUser();
      await orchestrator.addFeaturesToUser(createdUser, ["create:migration"]);
      const sessionObject = await orchestrator.createSession(createdUser.id);

      const { response, body } = await orchestrator.request(
        "/api/v1/migrations",
        {
          method: "POST",
          headers: {
            Cookie: `${session.COOKIE_NAME}=${sessionObject.token}`,
          },
        },
      );

      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );
      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
    });
  });
});
