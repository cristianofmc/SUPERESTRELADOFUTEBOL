import { handle } from "hono/vercel";
import type { Context } from "hono";
import { createEndpoint } from "#infra/endpoint";
import type { AppEnv } from "#infra/endpoint";
import user from "#models/user";
import activation from "#models/activation";
import { requireSchema } from "#infra/middlewares/validate";
import { canRequest } from "#infra/middlewares/authorize";
import authorization from "#models/authorization";

const endpoint = createEndpoint();

const userCreationSchema = {
  username: { type: "username", required: true },
  email: { type: "email", required: true },
  password: { type: "password", required: true },
} as const;

endpoint.post(
  "*",
  requireSchema(userCreationSchema),
  canRequest("create:user"),
  postHandler,
);

async function postHandler(context: Context<AppEnv>): Promise<Response> {
  const userTryingToPost = context.get("user");

  const userInputData = context.get("validatedBody") as {
    username: string;
    email: string;
    password: string;
  };

  const newUser = await user.create(userInputData);

  const activationToken = await activation.create(newUser.id);
  await activation.sendEmailToUser(newUser, activationToken);

  const secureOutputValues = authorization.filterOutput(
    userTryingToPost,
    "read:user",
    newUser,
  );

  return context.json(secureOutputValues, 201);
}

const handler = handle(endpoint);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
