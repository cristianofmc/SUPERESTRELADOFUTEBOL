import { Hono } from "hono";
import controller from "#infra/controller";
import { injectAnonymousOrUser } from "#infra/middlewares/authenticate";
import type { AuthUser } from "#infra/middlewares/authenticate";

// ─── AppEnv ───────────────────────────────────────────────────────────────────
// Declares all variables injected into Hono context across this app.
// Every middleware that calls context.set() must register its key here.
// Without this, context.get() returns unknown and every handler needs a cast.

export type AppEnv = {
  Variables: {
    user: AuthUser;
    validatedBody: unknown;
  };
};

export function createEndpoint() {
  const endpoint = new Hono<AppEnv>();

  endpoint.use("*", injectAnonymousOrUser);
  endpoint.onError(controller.errorHandlers.onError);
  endpoint.notFound(controller.errorHandlers.onNoMatch);

  return endpoint;
}
