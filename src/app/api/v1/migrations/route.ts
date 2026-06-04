import { handle } from "hono/vercel";
import type { Context } from "hono";
import { createEndpoint } from "#infra/endpoint";
import { requireSchema } from "#infra/middlewares/validate";
import { canRequest } from "#infra/middlewares/authorize";
import migrator from "#models/migrator";
import authorization from "#models/authorization";
import type { AppEnv } from "#infra/endpoint";

const endpoint = createEndpoint();

endpoint.get("*", requireSchema({}), canRequest("read:migration"), getHandler);
endpoint.post(
  "*",
  requireSchema({}),
  canRequest("create:migration"),
  postHandler,
);

async function getHandler(context: Context<AppEnv>): Promise<Response> {
  const userTryingToGet = context.get("user");

  const pendingMigrations = await migrator.listPendingMigrations();

  const secureOutputValues = authorization.filterOutput(
    userTryingToGet,
    "read:migration",
    pendingMigrations,
  );

  return context.json(secureOutputValues, 200);
}

async function postHandler(context: Context<AppEnv>): Promise<Response> {
  const userTryingToPost = context.get("user");

  const migratedMigrations = await migrator.runPendingMigrations();
  const status = migratedMigrations.length ? 201 : 200;

  const secureOutputValues = authorization.filterOutput(
    userTryingToPost,
    "read:migration",
    migratedMigrations,
  );

  return context.json(secureOutputValues, status);
}

const handler = handle(endpoint);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
