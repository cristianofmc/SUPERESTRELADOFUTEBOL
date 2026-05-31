import orchestrator from "#tests/orchestrator";
import session from "#models/session";
import setCookieParsers from "set-cookie-parser";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

describe("GET /api/v1/user", () => {
  describe("Anonymous user", () => {
    test("Should not receive a valid session without providing a cookie", async () => {
      const { response, body } = await orchestrator.request(`/api/v1/user`);

      expect(response.status).toBe(403);
      expect(body).toEqual({
        name: "ForbiddenError",
        message: "You do not have permission to perform this action.",
        action: "Please verify that your user has the 'read:session' feature.",
        status_code: 403,
      });
    });
  });

  describe("Default user", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    test("Should receive valid session", async () => {
      const created_user = await orchestrator.createActivatedUser();
      const sessionObject = await orchestrator.createSession(created_user.id);

      const { response, body } = await orchestrator.request(`/api/v1/user`, {
        headers: {
          Cookie: `${session.COOKIE_NAME}=${sessionObject.token}`,
        },
      });

      expect(response.status).toBe(200);

      const cacheControl = response.headers.get("Cache-Control");
      expect(cacheControl).toBe(
        "no-store, no-cache, max-age=0, must-revalidate",
      );

      expect(body).toEqual({
        id: created_user.id,
        username: created_user.username,
        email: created_user.email,
        features: ["create:session", "read:session", "update:user"],
        created_at: created_user.createdAt.toISOString(),
        updated_at: created_user.updatedAt.toISOString(),
      });

      expect((body as { id: string }).id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(Date.parse((body as { created_at: string }).created_at)).not.toBe(
        NaN,
      );
      expect(Date.parse((body as { updated_at: string }).updated_at)).not.toBe(
        NaN,
      );

      const renewedSessionObject = await session.findOneValidByToken(
        sessionObject.token,
      );

      expect(renewedSessionObject.expiresAt.getTime()).toBeGreaterThan(
        sessionObject.expiresAt.getTime(),
      );
      expect(renewedSessionObject.updatedAt.getTime()).toBeGreaterThan(
        sessionObject.updatedAt.getTime(),
      );

      const setCookieHeader = response.headers.get("set-cookie") ?? "";
      const parsedSetCookie = setCookieParsers(setCookieHeader, { map: true });

      expect(parsedSetCookie[session.COOKIE_NAME]).toEqual({
        name: session.COOKIE_NAME,
        value: sessionObject.token,
        maxAge: session.EXPIRATION_IN_MILLISECONDS / 1000,
        path: "/",
        httpOnly: true,
        sameSite: "Strict",
      });
    });

    test("Should receive valid session before one minute of expiration", async () => {
      const expirationMinusOneMinute =
        session.EXPIRATION_IN_MILLISECONDS - 60 * 1000;

      vi.useFakeTimers({
        now: new Date(Date.now() - expirationMinusOneMinute),
        toFake: ["Date"],
      });

      const created_user = await orchestrator.createActivatedUser();
      const sessionObject = await orchestrator.createSession(created_user.id);

      vi.useRealTimers();

      const { response, body } = await orchestrator.request(`/api/v1/user`, {
        headers: {
          Cookie: `${session.COOKIE_NAME}=${sessionObject.token}`,
        },
      });

      expect(response.status).toBe(200);

      expect(body).toEqual({
        id: created_user.id,
        username: created_user.username,
        email: created_user.email,
        features: ["create:session", "read:session", "update:user"],
        created_at: created_user.createdAt.toISOString(),
        updated_at: created_user.updatedAt.toISOString(),
      });

      expect((body as { id: string }).id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(Date.parse((body as { created_at: string }).created_at)).not.toBe(
        NaN,
      );
      expect(Date.parse((body as { updated_at: string }).updated_at)).not.toBe(
        NaN,
      );

      const renewedSessionObject = await session.findOneValidByToken(
        sessionObject.token,
      );

      expect(renewedSessionObject.expiresAt.getTime()).toBeGreaterThan(
        sessionObject.expiresAt.getTime(),
      );
      expect(renewedSessionObject.updatedAt.getTime()).toBeGreaterThan(
        sessionObject.updatedAt.getTime(),
      );

      const setCookieHeader = response.headers.get("set-cookie") ?? "";
      const parsedSetCookie = setCookieParsers(setCookieHeader, { map: true });

      expect(parsedSetCookie[session.COOKIE_NAME]).toEqual({
        name: session.COOKIE_NAME,
        value: sessionObject.token,
        maxAge: session.EXPIRATION_IN_MILLISECONDS / 1000,
        path: "/",
        httpOnly: true,
        sameSite: "Strict",
      });
    });

    test("Should not receive a valid session with nonexistent token", async () => {
      const nonexistentToken =
        "971a0a9446464fb8e242a99b690336ec0ce1b36de1c1a6d48d3c46db968ea36eaa5806db4bc784ebe42f5988d5fdc14e";

      const { response, body } = await orchestrator.request(`/api/v1/user`, {
        headers: {
          Cookie: `${session.COOKIE_NAME}=${nonexistentToken}`,
        },
      });

      expect(response.status).toBe(401);
      expect(body).toEqual({
        name: "UnauthorizedError",
        message: "The user does not have an active session.",
        action: "Please check if this user is logged in and try again.",
        status_code: 401,
      });
    });

    test("Should not receive a valid session after the expiration date", async () => {
      vi.useFakeTimers({
        now: new Date(Date.now() - session.EXPIRATION_IN_MILLISECONDS),
        toFake: ["Date"],
      });

      const created_user = await orchestrator.createUser();
      const sessionObject = await orchestrator.createSession(created_user.id);

      vi.useRealTimers();

      const { response, body } = await orchestrator.request(`/api/v1/user`, {
        headers: {
          Cookie: `${session.COOKIE_NAME}=${sessionObject.token}`,
        },
      });

      expect(response.status).toBe(401);
      expect(body).toEqual({
        name: "UnauthorizedError",
        message: "The user does not have an active session.",
        action: "Please check if this user is logged in and try again.",
        status_code: 401,
      });
    });
  });
});
