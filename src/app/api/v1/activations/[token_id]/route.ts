import { handle } from "hono/vercel";
import type { Context } from "hono";
import { createEndpoint } from "#infra/endpoint";
import type { AppEnv } from "#infra/endpoint";
import activation from "#models/activation";
import { requireSchema } from "#infra/middlewares/validate";
import { canRequest } from "#infra/middlewares/authorize";
import authorization from "#models/authorization";

const { markTokenAsUsed, activateUserByUserId, findOneValidTokenById } =
  activation;

const endpoint = createEndpoint();

endpoint.patch(
  "/api/v1/activations/:token_id",
  requireSchema({}),
  canRequest("read:activation_token"),
  patchHandler,
);

async function patchHandler(context: Context<AppEnv>) {
  const userTryingToPatch = context.get("user");
  const activationTokenId = context.req.param("token_id")!;
  const userToActivate = await findOneValidTokenById(activationTokenId);
  await activateUserByUserId(userToActivate.userId);
  const usedActivationToken = await markTokenAsUsed(activationTokenId);

  const secureOutputValues = authorization.filterOutput(
    userTryingToPatch,
    "read:activation_token",
    usedActivationToken,
  );
  return context.json(secureOutputValues, 200);
}

const handler = handle(endpoint);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
