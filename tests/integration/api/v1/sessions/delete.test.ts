import orchestrator from "#tests/orchestrator";
import session from "#models/session";
import setCookieParsers from "set-cookie-parser";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("DELETE /api/v1/sessions", () => {
  describe("Default user", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    test("should receive error on nonexistent session", async () => {
      const nonexistentToken =
        "971a0a9446464fb8e242a99b690336ec0ce1b36de1c1a6d48d3c46db968ea36eaa5806db4bc784ebe42f5988d5fdc14e";

      const { response, body } = await orchestrator.request(
        `/api/v1/sessions`,
        {
          method: "DELETE",
          headers: {
            Cookie: `${session.COOKIE_NAME}=${nonexistentToken}`,
          },
        },
      );

      expect(response.status).toBe(401);
      expect(body).toEqual({
        name: "UnauthorizedError",
        message: "The user does not have an active session.",
        action: "Please check if this user is logged in and try again.",
        status_code: 401,
      });
    });

    test("should delete expired session", async () => {
      vi.useFakeTimers({
        now: new Date(Date.now() - session.EXPIRATION_IN_MILLISECONDS),
        toFake: ["Date"],
      });

      const created_user = await orchestrator.createUser();
      const sessionObject = await orchestrator.createSession(created_user.id);

      vi.useRealTimers();

      const { response, body } = await orchestrator.request(
        `/api/v1/sessions`,
        {
          method: "DELETE",
          headers: {
            Cookie: `${session.COOKIE_NAME}=${sessionObject.token}`,
          },
        },
      );

      expect(response.status).toBe(401);
      expect(body).toEqual({
        name: "UnauthorizedError",
        message: "The user does not have an active session.",
        action: "Please check if this user is logged in and try again.",
        status_code: 401,
      });
    });

    test("should delete valid session", async () => {
      const created_user = await orchestrator.createUser();
      const sessionObject = await orchestrator.createSession(created_user.id);

      const { response, body } = await orchestrator.request(
        `/api/v1/sessions`,
        {
          method: "DELETE",
          headers: {
            Cookie: `${session.COOKIE_NAME}=${sessionObject.token}`,
          },
        },
      );

      const typedBody = body as {
        id: string;
        token: string;
        user_id: string;
        expires_at: string;
        created_at: string;
        updated_at: string;
      };

      expect(response.status).toBe(200);
      expect(typedBody).toEqual({
        id: sessionObject.id,
        token: sessionObject.token,
        user_id: sessionObject.userId,
        expires_at: typedBody.expires_at,
        created_at: typedBody.created_at,
        updated_at: typedBody.updated_at,
      });

      expect(typedBody.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(Date.parse(typedBody.expires_at)).not.toBe(NaN);
      expect(Date.parse(typedBody.created_at)).not.toBe(NaN);
      expect(Date.parse(typedBody.updated_at)).not.toBe(NaN);

      const expiresAtDate = new Date(typedBody.expires_at);
      const updatedAtDate = new Date(typedBody.updated_at);

      expect(expiresAtDate.getTime()).toBeLessThan(
        sessionObject.expiresAt.getTime(),
      );
      expect(updatedAtDate.getTime()).toBeGreaterThan(
        sessionObject.updatedAt.getTime(),
      );

      const setCookieHeader = response.headers.get("set-cookie") ?? "";
      const parsedSetCookie = setCookieParsers(setCookieHeader, { map: true });

      expect(parsedSetCookie[session.COOKIE_NAME]).toEqual({
        name: session.COOKIE_NAME,
        value: "invalid",
        path: "/",
        httpOnly: true,
        sameSite: "Strict",
      });

      const { response: doubleCheckResponse, body: doubleCheckBody } =
        await orchestrator.request(`/api/v1/user`, {
          headers: {
            Cookie: `${session.COOKIE_NAME}=${sessionObject.token}`,
          },
        });

      expect(doubleCheckResponse.status).toBe(401);
      expect(doubleCheckBody).toEqual({
        name: "UnauthorizedError",
        message: "The user does not have an active session.",
        action: "Please check if this user is logged in and try again.",
        status_code: 401,
      });
    });
  });
});
