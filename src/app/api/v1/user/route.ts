import { handle } from "hono/vercel";
import type { Context } from "hono";
import { createEndpoint } from "#infra/endpoint";
import type { AppEnv } from "#infra/endpoint";
import user from "#models/user";
import { getCookie } from "hono/cookie";
import session from "#models/session";
import controller from "#infra/controller";
import { canRequest } from "#infra/middlewares/authorize";
import { requireSchema } from "#infra/middlewares/validate";
import authorization from "#models/authorization";

const endpoint = createEndpoint();

endpoint.get("*", requireSchema({}), canRequest("read:session"), getHandler);

async function getHandler(context: Context<AppEnv>) {
  const userTryingToGet = context.get("user");
  const sessionToken = getCookie(context, session.COOKIE_NAME);
  const sessionObject = await session.findOneValidByToken(sessionToken!);
  const renewedSessionObject = await session.renew(sessionObject.id);

  controller.setSessionCookie(renewedSessionObject.token, context);
  context.header(
    "Cache-Control",
    "no-store, no-cache, max-age=0, must-revalidate",
  );

  const userFound = await user.findOneById(renewedSessionObject.userId);
  const secureOutputValues = authorization.filterOutput(
    userTryingToGet,
    "read:user:self",
    userFound,
  );

  return context.json(secureOutputValues, 200);
}

const handler = handle(endpoint);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
