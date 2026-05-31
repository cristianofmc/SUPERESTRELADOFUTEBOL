import validator, { type ValidatorSchema } from "#infra/validators";
import type { Context, Next } from "hono";

export function requireSchema(schema: ValidatorSchema) {
  return async (context: Context, next: Next) => {
    const bodyText = await context.req.text();
    let body = {};

    if (bodyText) {
      body = JSON.parse(bodyText);
    }

    validator.validate(body, schema);

    context.set("validatedBody", body);
    await next();
  };
}
