import orchestrator from "#tests/orchestrator";
import user from "#models/user";
import password from "#models/password";
import session from "#models/session";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("PATCH /api/v1/users/[username]", () => {
  describe("Anonymous user", () => {
    test("should not update the password when sent in the PATCH body", async () => {
      const createdUser = await orchestrator.createUser();

      const { response, body } = await orchestrator.request(
        `/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password: "NewSecurePassword@456",
          }),
        },
      );

      expect(response.status).toBe(403);
      expect(body).toEqual({
        name: "ForbiddenError",
        message: "You do not have permission to perform this action.",
        action: "Please verify that your user has the 'update:user' feature.",
        status_code: 403,
      });
    });
  });

  describe("Default user", () => {
    test("should return 404 when updating a non-existent user", async () => {
      const createdUser = await orchestrator.createActivatedUser();
      const sessionObject = await orchestrator.createSession(createdUser.id);

      const { response, body } = await orchestrator.request(
        "/api/v1/users/GhostJimmyFive",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `${session.COOKIE_NAME}=${sessionObject.token}`,
          },
          body: JSON.stringify({
            username: "WillNeverExist",
          }),
        },
      );

      expect(response.status).toBe(404);
      expect(body).toEqual({
        name: "NotFoundError",
        message: "The username provided was not found.",
        action: "Please check that the username was entered correctly.",
        status_code: 404,
      });
    });

    test("should return 400 when sending an empty payload", async () => {
      await orchestrator.request("/api/v1/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "EmptyPayloadUser",
          email: "empty@host.testemail",
          password: "Test@123",
        }),
      });

      const { response, body } = await orchestrator.request(
        "/api/v1/users/EmptyPayloadUser",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );

      expect(response.status).toBe(400);
      expect(body).toEqual({
        name: "ValidationError",
        message: "No data provided in the request body.",
        action:
          "Please provide at least one valid field: username, email, password.",
        status_code: 400,
      });
    });

    test("should return 400 when sending malformed JSON", async () => {
      const { response, body } = await orchestrator.request(
        "/api/v1/users/AnyUser",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: '{ "username": "JimmyFive"',
        },
      );

      expect(response.status).toBe(400);
      expect(body).toEqual({
        name: "ValidationError",
        message: "The request body does not contain valid JSON.",
        action:
          "Please check the syntax of the submitted JSON or ensure the request body is not empty.",
        status_code: 400,
      });
    });

    test("should return 400 when updating with an invalid email format", async () => {
      const { response, body } = await orchestrator.request(
        "/api/v1/users/EmptyPayloadUser",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "not-an-email",
          }),
        },
      );

      expect(response.status).toBe(400);
      expect(body).toEqual({
        name: "ValidationError",
        message: "The email format is invalid.",
        action: "Please provide a valid email address.",
        status_code: 400,
      });
    });

    test("should return 400 when updating with an invalid username", async () => {
      const { response, body } = await orchestrator.request(
        "/api/v1/users/EmptyPayloadUser",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "Invalid Jimmy Five!",
          }),
        },
      );

      expect(response.status).toBe(400);
      expect(body).toEqual({
        name: "ValidationError",
        message: "The username provided is invalid.",
        action:
          "Please ensure that the username is between 3 and 30 characters, contains only letters, numbers or underscores, does not start or end with underscores, and does not have two consecutive underscores.",
        status_code: 400,
      });
    });

    test("should not update to an email that is already in use by another user", async () => {
      const createdUser = await orchestrator.createActivatedUser({
        email: "first_Jimmy_five@email.testemail",
      });
      const sessionObject = await orchestrator.createSession(createdUser.id);

      const createdUser2 = await orchestrator.createUser({
        email: "second_Jimmy_five@email.testemail",
      });

      const { response, body } = await orchestrator.request(
        `/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `${session.COOKIE_NAME}=${sessionObject.token}`,
          },
          body: JSON.stringify({
            email: createdUser2.email,
          }),
        },
      );

      expect(response.status).toBe(400);
      expect(body).toEqual({
        name: "ValidationError",
        message: "The email address provided is already registered.",
        action: "Please try again with a different email.",
        status_code: 400,
      });
    });

    test("should not update to a username that is already in use by another user", async () => {
      const createdUser = await orchestrator.createActivatedUser();
      const sessionObject = await orchestrator.createSession(createdUser.id);

      const createdUser2 = await orchestrator.createUser();

      const { response, body } = await orchestrator.request(
        `/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `${session.COOKIE_NAME}=${sessionObject.token}`,
          },
          body: JSON.stringify({
            username: createdUser2.username,
          }),
        },
      );

      expect(response.status).toBe(400);
      expect(body).toEqual({
        name: "ValidationError",
        message: "The username provided is already registered.",
        action: "Please try again with a different username.",
        status_code: 400,
      });
    });

    test("should not update the username of another user", async () => {
      const createdUser = await orchestrator.createActivatedUser();
      const sessionObject = await orchestrator.createSession(createdUser.id);

      const createdUser2 = await orchestrator.createUser();

      const { response, body } = await orchestrator.request(
        `/api/v1/users/${createdUser2.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `${session.COOKIE_NAME}=${sessionObject.token}`,
          },
          body: JSON.stringify({
            username: `${createdUser2.username}_jimmy_five`,
          }),
        },
      );

      expect(response.status).toBe(403);
      expect(body).toEqual({
        name: "ForbiddenError",
        message: "You do not have permission to update another user.",
        action:
          "Please verify that you have the required feature to update another user.",
        status_code: 403,
      });
    });

    test("should not update an existing user with weak password data", async () => {
      const createdUser = await orchestrator.createActivatedUser({
        password: "1first_Password",
      });
      const sessionObject = await orchestrator.createSession(createdUser.id);

      const { response, body } = await orchestrator.request(
        `/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `${session.COOKIE_NAME}=${sessionObject.token}`,
          },
          body: JSON.stringify({
            password: "@Jimmy_Five",
          }),
        },
      );

      expect(response.status).toBe(400);
      expect(body).toEqual({
        name: "ValidationError",
        message: "The password provided is too weak.",
        action:
          "Please provide a password with at least 8 characters, including at least one number and one special character.",
        status_code: 400,
      });
    });

    test("should update an existing user with valid username data", async () => {
      const createdUser = await orchestrator.createActivatedUser();
      const sessionObject = await orchestrator.createSession(createdUser.id);

      const { response, body } = await orchestrator.request(
        `/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `${session.COOKIE_NAME}=${sessionObject.token}`,
          },
          body: JSON.stringify({
            username: `${createdUser.username}_jimmy_five`,
          }),
        },
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
        username: `${createdUser.username}_jimmy_five`,
        features: ["create:session", "read:session", "update:user"],
        created_at: typedBody.created_at,
        updated_at: typedBody.updated_at,
      });

      expect(typedBody.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(Date.parse(typedBody.created_at)).not.toBe(NaN);
      expect(new Date(typedBody.updated_at).getTime()).toBeGreaterThan(
        new Date(typedBody.created_at).getTime(),
      );
    });

    test("should update an existing user with valid email data", async () => {
      const createdUser = await orchestrator.createActivatedUser();
      const sessionObject = await orchestrator.createSession(createdUser.id);

      const { response, body } = await orchestrator.request(
        `/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `${session.COOKIE_NAME}=${sessionObject.token}`,
          },
          body: JSON.stringify({
            email: `${createdUser.email}.jimmyfive`,
          }),
        },
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
        features: ["create:session", "read:session", "update:user"],
        created_at: typedBody.created_at,
        updated_at: typedBody.updated_at,
      });

      expect(typedBody.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(Date.parse(typedBody.created_at)).not.toBe(NaN);
      expect(new Date(typedBody.updated_at).getTime()).toBeGreaterThan(
        new Date(typedBody.created_at).getTime(),
      );
    });

    test("should update an existing user with valid password data", async () => {
      const createdUser = await orchestrator.createActivatedUser({
        password: "1first_Password",
      });
      const sessionObject = await orchestrator.createSession(createdUser.id);

      const { response, body } = await orchestrator.request(
        `/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `${session.COOKIE_NAME}=${sessionObject.token}`,
          },
          body: JSON.stringify({
            password: "@Jimmy_Fiv3",
          }),
        },
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
        features: ["create:session", "read:session", "update:user"],
        created_at: typedBody.created_at,
        updated_at: typedBody.updated_at,
      });

      expect(typedBody.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(Date.parse(typedBody.created_at)).not.toBe(NaN);
      expect(new Date(typedBody.updated_at).getTime()).toBeGreaterThan(
        new Date(typedBody.created_at).getTime(),
      );

      const userInDatabase = await user.findOneByUsername(createdUser.username);

      expect(
        await password.compare("@Jimmy_Fiv3", userInDatabase.password),
      ).toBe(true);
      expect(
        await password.compare("firstPassword", userInDatabase.password),
      ).toBe(false);
    });

    test("should update an existing user with valid data", async () => {
      const createdUser = await orchestrator.createActivatedUser({
        username: "OriginalJimmyFive",
        email: "original_jimmy_five@host.testemail",
        password: "Test@123",
      });
      const sessionObject = await orchestrator.createSession(createdUser.id);

      const { response, body } = await orchestrator.request(
        "/api/v1/users/OriginalJimmyFive",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `${session.COOKIE_NAME}=${sessionObject.token}`,
          },
          body: JSON.stringify({
            username: "updated_Jimmy_Five",
            email: "updated_jimmy_five@host.testemail",
            password: "1_update@Password",
          }),
        },
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
        username: "updated_jimmy_five",
        features: ["create:session", "read:session", "update:user"],
        created_at: typedBody.created_at,
        updated_at: typedBody.updated_at,
      });

      expect(typedBody.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(Date.parse(typedBody.created_at)).not.toBe(NaN);
      expect(new Date(typedBody.updated_at).getTime()).toBeGreaterThan(
        new Date(typedBody.created_at).getTime(),
      );

      const userInDatabase = await user.findOneByUsername("updated_jimmy_five");

      expect(
        await password.compare("1_update@Password", userInDatabase.password),
      ).toBe(true);
      expect(await password.compare("Test@123", userInDatabase.password)).toBe(
        false,
      );
    });
  });

  describe("Privileged user", () => {
    test("should update the username of another user", async () => {
      const privilegedUser = await orchestrator.createActivatedUser();
      await orchestrator.addFeaturesToUser(privilegedUser, [
        "update:user:others",
      ]);
      const sessionObject = await orchestrator.createSession(privilegedUser.id);

      const defaultUser = await orchestrator.createUser();

      const { response, body } = await orchestrator.request(
        `/api/v1/users/${defaultUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `${session.COOKIE_NAME}=${sessionObject.token}`,
          },
          body: JSON.stringify({
            username: `${defaultUser.username}_jimmy_five`,
          }),
        },
      );

      const typedBody = body as {
        id: string;
        username: string;
        password: string;
        features: string[];
        created_at: string;
        updated_at: string;
      };

      expect(response.status).toBe(200);
      expect(typedBody).toEqual({
        id: defaultUser.id,
        username: `${defaultUser.username}_jimmy_five`,
        password: typedBody.password,
        features: ["read:activation_token"],
        created_at: defaultUser.createdAt.toISOString(),
        updated_at: typedBody.updated_at,
      });

      expect(typedBody.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(Date.parse(typedBody.created_at)).not.toBe(NaN);
      expect(new Date(typedBody.updated_at).getTime()).toBeGreaterThan(
        new Date(typedBody.created_at).getTime(),
      );
    });
  });
});
