import orchestrator from "#tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

describe("POST /api/v1/status", () => {
  describe("Anonymous user", () => {
    test("should return MethodNotAllowedError when using an invalid method", async () => {
      const { response, body } = await orchestrator.request("/api/v1/status", {
        method: "POST",
      });

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
