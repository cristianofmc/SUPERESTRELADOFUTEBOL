import { handle } from "hono/vercel";
import type { Context } from "hono";
import { createEndpoint } from "#infra/endpoint";
import type { AppEnv } from "#infra/endpoint";
import user from "#models/user";
import type { UpdateUserInput } from "#models/user";
import { requireSchema } from "#infra/middlewares/validate";
import type { ValidatorSchema } from "#infra/validators";
import { canRequest } from "#infra/middlewares/authorize";
import authorization from "#models/authorization";
import { ForbiddenError } from "#infra/errors";

const endpoint = createEndpoint();

const updateSchema: ValidatorSchema = {
  username: { type: "username", required: false },
  email: { type: "email", required: false },
  password: { type: "password", required: false },
};

endpoint.get("/api/v1/users/:username", getHandler);
endpoint.patch(
  "/api/v1/users/:username",
  requireSchema(updateSchema),
  canRequest("update:user"),
  patchHandler,
);

async function getHandler(context: Context<AppEnv>) {
  const userTryingToGet = context.get("user");
  const username = context.req.param("username")!;
  const userFound = await user.findOneByUsername(username);

  const secureOutputValues = authorization.filterOutput(
    userTryingToGet,
    "read:user",
    userFound,
  );
  return context.json(secureOutputValues, 200);
}

async function patchHandler(context: Context<AppEnv>) {
  const username = context.req.param("username")!;
  const updateData = context.get("validatedBody") as UpdateUserInput;

  const userTryingToPatch = context.get("user");
  const targetUser = await user.findOneByUsername(username);

  if (!authorization.can(userTryingToPatch, "update:user", targetUser)) {
    throw new ForbiddenError({
      message: "You do not have permission to update another user.",
      action:
        "Please verify that you have the required feature to update another user.",
    });
  }

  const updatedUser = await user.updateByUsername(username, updateData);
  const secureOutputValues = authorization.filterOutput(
    userTryingToPatch,
    "read:user",
    updatedUser,
  );

  return context.json(secureOutputValues, 200);
}

const handler = handle(endpoint);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
