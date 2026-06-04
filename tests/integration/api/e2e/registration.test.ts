import orchestrator from "#tests/orchestrator";
import config from "#infra/config";
import activation from "#models/activation";
import user from "#models/user";
import session from "#models/session";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
  await orchestrator.deleteAllEmails();
});

describe("E2E registration happy path", () => {
  let userResponseBody: unknown;
  let token: string;
  let userSession: { token: string; user_id: string };

  test("Create user account", async () => {
    const { response, body } = await orchestrator.request("/api/v1/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "New_Jimmy_Five",
        email: "newjimmyfive@host.testemail",
        password: "Test@123",
      }),
    });

    expect(response.status).toBe(201);
    userResponseBody = body;

    expect(body).toEqual({
      id: (body as { id: string }).id,
      username: "new_jimmy_five",
      features: ["read:activation_token"],
      created_at: (body as { created_at: string }).created_at,
      updated_at: (body as { updated_at: string }).updated_at,
    });
  });

  test("Receive activation email", async () => {
    const lastEmail = await orchestrator.getLastEmail();

    token = orchestrator.extractUUID(lastEmail!.text!)!;
    expect(lastEmail!.sender).toBe(`<${config.appEmail}>`);

    expect((lastEmail!.recipients as string[])[0]).toBe(
      "<newjimmyfive@host.testemail>",
    );
    expect(lastEmail!.subject).toBe("Please activate your account.");
    expect(lastEmail!.text).toContain("new_jimmy_five");
    expect(lastEmail!.text).toContain(
      `${config.origin}/sign_up/activate/${token}`,
    );

    const validTokenObject = await activation.findOneValidTokenById(token);
    expect(token).toBe(validTokenObject.id);
    expect(validTokenObject.userId).toBe(
      (userResponseBody as { id: string }).id,
    );
    expect(validTokenObject.usedAt).toBeNull();

    vi.useFakeTimers({
      now: new Date(Date.now() + activation.EXPIRATION_IN_MILLISECONDS),
      toFake: ["Date"],
    });

    await expect(activation.findOneValidTokenById(token)).rejects.toThrow(
      "The activation token provided was not found in the system or has expired.",
    );

    vi.useRealTimers();

    const otherValidTokenObject = await activation.findOneValidTokenById(token);
    expect(token).toBe(otherValidTokenObject.id);
    expect(otherValidTokenObject.userId).toBe(
      (userResponseBody as { id: string }).id,
    );
    expect(otherValidTokenObject.usedAt).toBeNull();
  });

  test("Activate account", async () => {
    const { response, body } = await orchestrator.request(
      `/api/v1/activations/${token}`,
      { method: "PATCH" },
    );

    expect(response.status).toBe(200);
    expect(Date.parse((body as { used_at: string }).used_at)).not.toBeNaN();

    const activatedUser = await user.findOneByUsername("new_jimmy_five");
    expect(activatedUser.features).toEqual([
      "create:session",
      "read:session",
      "update:user",
    ]);
  });

  test("Sign in", async () => {
    const { response, body } = await orchestrator.request(`/api/v1/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "newjimmyfive@host.testemail",
        password: "Test@123",
      }),
    });

    userSession = body as { token: string; user_id: string };
    expect(response.status).toBe(201);
    expect(userSession.user_id).toBe((userResponseBody as { id: string }).id);
  });

  test("Get user information", async () => {
    const { response, body } = await orchestrator.request(`/api/v1/user`, {
      headers: {
        Cookie: `${session.COOKIE_NAME}=${userSession.token}`,
      },
    });

    const typedBody = body as {
      id: string;
      username: string;
      email: string;
      password: string;
      features: string[];
      created_at: string;
      updated_at: string;
    };

    const typedUserResponseBody = userResponseBody as {
      id: string;
      username: string;
      created_at: string;
    };

    expect(response.status).toBe(200);

    const cacheControl = response.headers.get("Cache-Control");
    expect(cacheControl).toBe("no-store, no-cache, max-age=0, must-revalidate");

    expect(typedBody).toEqual({
      id: typedUserResponseBody.id,
      username: typedUserResponseBody.username,
      email: typedBody.email,
      password: typedBody.password,
      features: ["create:session", "read:session", "update:user"],
      created_at: typedUserResponseBody.created_at,
      updated_at: typedBody.updated_at,
    });

    expect(Date.parse(typedBody.created_at)).not.toBe(NaN);
    expect(Date.parse(typedBody.updated_at)).not.toBe(NaN);
  });
});
