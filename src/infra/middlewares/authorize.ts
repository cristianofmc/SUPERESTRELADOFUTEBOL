import { ForbiddenError } from "#infra/errors";
import authorization, { type Feature } from "#models/authorization";
import type { Context, Next } from "hono";
import type { AppEnv } from "#infra/endpoint";

export function canRequest(feature: Feature) {
  return async (context: Context<AppEnv>, next: Next) => {
    const userTryingToRequest = context.get("user");

    if (authorization.can(userTryingToRequest, feature)) {
      return await next();
    }

    throw new ForbiddenError({
      message: "You do not have permission to perform this action.",
      action: `Please verify that your user has the '${feature}' feature.`,
    });
  };
}
