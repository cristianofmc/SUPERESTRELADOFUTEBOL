import orchestrator from "#tests/orchestrator";
import session from "#models/session";
import setCookieParsers from "set-cookie-parser";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

describe("POST /api/v1/sessions", () => {
  describe("Anonymous user", () => {
    test("should not create session with incorrect email", async () => {
      await orchestrator.createUser({
        password: "correct_P@ss0rd",
      });

      const { response, body } = await orchestrator.request(
        "/api/v1/sessions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: "whrong_email@host.testemail",
            password: "correct_P@ss0rd",
          }),
        },
      );

      expect(response.status).toBe(401);
      expect(body).toEqual({
        name: "UnauthorizedError",
        message: "Incorrect authentication data.",
        action: "Please verify that the submitted data is correct.",
        status_code: 401,
      });
    });

    test("should not create session with incorrect password", async () => {
      const createdUser = await orchestrator.createUser({
        password: "wrong_P@ss0rd",
      });

      const { response, body } = await orchestrator.request(
        "/api/v1/sessions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: createdUser.email,
            password: "correct_P@ss0rd",
          }),
        },
      );

      expect(response.status).toBe(401);
      expect(body).toEqual({
        name: "UnauthorizedError",
        message: "Incorrect authentication data.",
        action: "Please verify that the submitted data is correct.",
        status_code: 401,
      });
    });

    test("should not create session with incorrect email and password", async () => {
      await orchestrator.createUser();

      const { response, body } = await orchestrator.request(
        "/api/v1/sessions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: "incorrect_email@email.testemail",
            password: "incorrect_P@ss0rd",
          }),
        },
      );

      expect(response.status).toBe(401);
      expect(body).toEqual({
        name: "UnauthorizedError",
        message: "Incorrect authentication data.",
        action: "Please verify that the submitted data is correct.",
        status_code: 401,
      });
    });

    test("should create session with correct data", async () => {
      const newUser = await orchestrator.createActivatedUser({
        password: "!23NoMad",
      });

      const { response, body } = await orchestrator.request(
        "/api/v1/sessions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: newUser.email,
            password: "!23NoMad",
          }),
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

      expect(response.status).toBe(201);
      expect(typedBody).toEqual({
        id: typedBody.id,
        token: typedBody.token,
        user_id: newUser.id,
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

      const expiresAt = new Date(typedBody.expires_at);
      const createdAt = new Date(typedBody.created_at);

      expiresAt.setMilliseconds(0);
      createdAt.setMilliseconds(0);

      expect(expiresAt.getTime()).toBe(
        createdAt.getTime() + session.EXPIRATION_IN_MILLISECONDS,
      );

      const setCookieHeader = response.headers.get("set-cookie") ?? "";
      const parsedSetCookie = setCookieParsers(setCookieHeader, { map: true });

      expect(parsedSetCookie[session.COOKIE_NAME]).toEqual({
        name: session.COOKIE_NAME,
        value: typedBody.token,
        maxAge: session.EXPIRATION_IN_MILLISECONDS / 1000,
        path: "/",
        httpOnly: true,
        sameSite: "Strict",
      });
    });
  });
});
