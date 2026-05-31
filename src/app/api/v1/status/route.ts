import { handle } from "hono/vercel";
import type { Context } from "hono";
import database from "#infra/database";
import { createEndpoint } from "#infra/endpoint";
import { requireSchema } from "#infra/middlewares/validate";
import authorization from "#models/authorization";
import type { AppEnv } from "#infra/endpoint";

const endpoint = createEndpoint();

endpoint.get("*", requireSchema({}), getHandler);

async function getHandler(context: Context<AppEnv>): Promise<Response> {
  const userTryingToGet = context.get("user");

  const database_status = await database.status();

  const statusObject = {
    updatedAt: new Date(),
    database: {
      maxConnections: database_status.max_connections,
      currentConnections: database_status.current_connections,
      serverVersion: database_status.server_version,
      environment: database_status.environment,
    },
  };

  const secureOutputValues = authorization.filterOutput(
    userTryingToGet,
    "read:status",
    statusObject,
  );

  return context.json(secureOutputValues, 200);
}

const handler = handle(endpoint);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
