import orchestrator from "#tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/users/[username]", () => {
  describe("Anonymous user", () => {
    test("Username should match with exact case", async () => {
      const createdUser = await orchestrator.createUser();

      const { response, body } = await orchestrator.request(
        `/api/v1/users/${createdUser.username}`,
      );

      const typedBody = body as {
        id: string;
        username: string;
        features: string[];
        created_at: string;
        updated_at: string;
      };

      expect(response.status).toBe(200);
      expect(typedBody).toEqual({
        id: typedBody.id,
        username: createdUser.username,
        features: ["read:activation_token"],
        created_at: typedBody.created_at,
        updated_at: typedBody.updated_at,
      });

      expect(typedBody.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(Date.parse(typedBody.created_at)).not.toBe(NaN);
      expect(Date.parse(typedBody.updated_at)).not.toBe(NaN);
    });

    test("Username should mismatch with case", async () => {
      await orchestrator.createUser({
        username: "CaseJimmyFiveCase",
      });

      const { response, body } = await orchestrator.request(
        "/api/v1/users/casejimmyfivecase",
      );

      const typedBody = body as {
        id: string;
        username: string;
        features: string[];
        created_at: string;
        updated_at: string;
      };

      expect(response.status).toBe(200);
      expect(typedBody).toEqual({
        id: typedBody.id,
        username: "casejimmyfivecase",
        features: ["read:activation_token"],
        created_at: typedBody.created_at,
        updated_at: typedBody.updated_at,
      });

      expect(typedBody.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(Date.parse(typedBody.created_at)).not.toBe(NaN);
      expect(Date.parse(typedBody.updated_at)).not.toBe(NaN);
    });

    test("shouldn't find non existent username", async () => {
      const { response, body } = await orchestrator.request(
        "/api/v1/users/NonExistentUser",
      );

      expect(response.status).toBe(404);
      expect(body).toEqual({
        name: "NotFoundError",
        message: "The username provided was not found.",
        action: "Please check that the username was entered correctly.",
        status_code: 404,
      });
    });
  });
});
