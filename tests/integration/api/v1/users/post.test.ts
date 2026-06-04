import orchestrator from "#tests/orchestrator";
import { version as uuidVersion } from "uuid";
import user from "#models/user";
import password from "#models/password";
import session from "#models/session";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/users", () => {
  describe("Anonymous user", () => {
    test("should create a new user account with unique and valid data", async () => {
      const { response, body } = await orchestrator.request("/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "jimmyfive",
          email: "jimmyfive@host.testemail",
          password: "Test@123",
        }),
      });

      const typedBody = body as {
        id: string;
        username: string;
        features: string[];
        created_at: string;
        updated_at: string;
      };

      expect(response.status).toBe(201);

      expect(typedBody).toEqual({
        id: typedBody.id,
        username: "jimmyfive",
        features: ["read:activation_token"],
        created_at: typedBody.created_at,
        updated_at: typedBody.updated_at,
      });

      expect(uuidVersion(typedBody.id)).toBe(4);
      expect(Date.parse(typedBody.created_at)).not.toBe(NaN);
      expect(Date.parse(typedBody.updated_at)).not.toBe(NaN);

      const userInDatabase = await user.findOneByUsername("jimmyfive");
      const correctPasswordMatch = await password.compare(
        "Test@123",
        userInDatabase.password,
      );

      expect(correctPasswordMatch).toBe(true);

      const incorrectPasswordMatch = await password.compare(
        "incorrectPassword",
        userInDatabase.password,
      );

      expect(incorrectPasswordMatch).toBe(false);
    });

    test("should not create a new user account with duplicated email", async () => {
      const returnRequest = await orchestrator.request("/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "first_jimmyfive",
          email: "duplicated_email_jimmyfive@host.testemail",
          password: "Test@123",
        }),
      });

      expect(returnRequest.response.status).toBe(201);

      const returnRequest2 = await orchestrator.request("/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "second_jimmyfive",
          email: "Duplicated_email_jimmyfive@host.testemail",
          password: "Test@123",
        }),
      });

      expect(returnRequest2.response.status).toBe(400);

      expect(returnRequest2.body).toEqual({
        name: "ValidationError",
        message: "The email address provided is already registered.",
        action: "Please try again with a different email.",
        status_code: 400,
      });
    });

    test("should not create a new user account with duplicated username", async () => {
      const returnRequest = await orchestrator.request("/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "duplicated_jimmyfive",
          email: "first_duplicated_username_jimmyfive@host.testemail",
          password: "Test@123",
        }),
      });

      expect(returnRequest.response.status).toBe(201);

      const returnRequest2 = await orchestrator.request("/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "Duplicated_jimmyfive",
          email: "second_duplicated_username_jimmyfive@host.testemail",
          password: "Test@123",
        }),
      });

      expect(returnRequest2.response.status).toBe(400);

      expect(returnRequest2.body).toEqual({
        name: "ValidationError",
        message: "The username provided is already registered.",
        action: "Please try again with a different username.",
        status_code: 400,
      });
    });
  });

  describe("Default user", () => {
    test("Should fail to create a new account with already logged in user", async () => {
      const user1 = await orchestrator.createActivatedUser();
      const user1SessionObject = await orchestrator.createSession(user1.id);

      const { response, body } = await orchestrator.request("/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `${session.COOKIE_NAME}=${user1SessionObject.token}`,
        },
        body: JSON.stringify({
          username: "jimmyfive_new_user",
          email: "jimmyfive_new_user@host.testemail",
          password: "Test@123",
        }),
      });

      expect(response.status).toBe(403);
      expect(body).toEqual({
        name: "ForbiddenError",
        message: "You do not have permission to perform this action.",
        action: "Please verify that your user has the 'create:user' feature.",
        status_code: 403,
      });
    });
  });
});
