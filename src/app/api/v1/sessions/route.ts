import { handle } from "hono/vercel";
import { getCookie } from "hono/cookie";
import type { Context } from "hono";
import { createEndpoint } from "#infra/endpoint";
import { requireSchema } from "#infra/middlewares/validate";
import { canRequest } from "#infra/middlewares/authorize";
import authentication from "#models/authentication";
import session from "#models/session";
import controller from "#infra/controller";
import authorization from "#models/authorization";
import { ForbiddenError } from "#infra/errors";
import type { AppEnv } from "#infra/endpoint";

const endpoint = createEndpoint();

const loginSchema = {
  email: { type: "notEmptyText", required: true },
  password: { type: "notEmptyText", required: true },
} as const;

endpoint.post(
  "*",
  requireSchema(loginSchema),
  canRequest("create:session"),
  postHandler,
);

endpoint.delete("*", requireSchema({}), deleteHandler);

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function postHandler(context: Context<AppEnv>): Promise<Response> {
  const userInputValues = context.get("validatedBody") as {
    email: string;
    password: string;
  };

  const authenticatedUser = await authentication.getAuthenticatedUser(
    userInputValues.email,
    userInputValues.password,
  );

  if (!authorization.can(authenticatedUser, "create:session")) {
    throw new ForbiddenError({
      message: "You do not have permission to log in.",
      action: "Please contact support if you believe this is an error.",
    });
  }

  const newSession = await session.create(authenticatedUser.id);

  controller.setSessionCookie(newSession.token, context);

  const secureOutputValues = authorization.filterOutput(
    authenticatedUser,
    "read:session",
    newSession,
  );

  return context.json(secureOutputValues, 201);
}

async function deleteHandler(context: Context<AppEnv>): Promise<Response> {
  const userTryingToDelete = context.get("user");

  const sessionToken = getCookie(context, session.COOKIE_NAME);

  if (!sessionToken) {
    throw new ForbiddenError({
      message: "No active session found.",
      action: "Please log in and try again.",
    });
  }

  const sessionObject = await session.findOneValidByToken(sessionToken);
  const expiredSession = await session.expireById(sessionObject.id);

  controller.clearSessionCookie(context);

  const secureOutputValues = authorization.filterOutput(
    userTryingToDelete,
    "read:session",
    expiredSession,
  );

  return context.json(secureOutputValues, 200);
}

// ─── Vercel Handler ───────────────────────────────────────────────────────────

const handler = handle(endpoint);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
