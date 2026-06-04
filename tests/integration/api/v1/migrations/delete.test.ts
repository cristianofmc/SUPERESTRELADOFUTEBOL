import orchestrator from "#tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("DELETE /api/v1/migrations", () => {
  describe("Anonymous user", () => {
    test("should return MethodNotAllowedError when using an invalid method", async () => {
      const { response, body } = await orchestrator.request(
        "/api/v1/migrations",
        {
          method: "DELETE",
        },
      );

      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );
      expect(response.status).toBe(405);
      expect(body).toEqual({
        name: "MethodNotAllowedError",
        message: "This method is not allowed for this endpoint.",
        action: "Please verify that the HTTP method is valid.",
        status_code: 405,
      });
    });
  });
});
