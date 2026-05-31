import {
  InternalServerError,
  ValidationError,
  NotFoundError,
  MethodNotAllowedError,
  UnauthorizedError,
  ForbiddenError,
} from "#infra/errors";
import { setCookie } from "hono/cookie";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import session from "#models/session";

function setSessionCookie(sessionToken: string, context: Context) {
  setCookie(context, session.COOKIE_NAME, sessionToken, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: session.EXPIRATION_IN_MILLISECONDS / 1000,
    partitioned: process.env.NODE_ENV === "production",
  });
}

function clearSessionCookie(context: Context) {
  setCookie(context, session.COOKIE_NAME, "invalid", {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: -1,
    partitioned: process.env.NODE_ENV === "production",
  });
}

function onError(error: Error, context: Context) {
  if (error instanceof SyntaxError && error.message.includes("JSON")) {
    const publicErrorObject = new ValidationError({
      message: "The request body does not contain valid JSON.",
      action:
        "Please check the syntax of the submitted JSON or ensure the request body is not empty.",
    });
    return context.json(
      publicErrorObject,
      publicErrorObject.statusCode as ContentfulStatusCode,
    );
  }

  if (error instanceof UnauthorizedError) clearSessionCookie(context);

  if (
    error instanceof ValidationError ||
    error instanceof NotFoundError ||
    error instanceof UnauthorizedError ||
    error instanceof ForbiddenError
  ) {
    return context.json(error, error.statusCode as ContentfulStatusCode);
  }

  const publicErrorObject = new InternalServerError({
    cause: error,
  });

  console.log("\nHono controller error:");
  console.error(publicErrorObject);

  return context.json(
    publicErrorObject,
    publicErrorObject.statusCode as ContentfulStatusCode,
  );
}

function onNoMatch(context: Context) {
  const publicErrorObject = new MethodNotAllowedError();
  return context.json(
    publicErrorObject,
    publicErrorObject.statusCode as ContentfulStatusCode,
  );
}

const controller = {
  errorHandlers: {
    onError,
    onNoMatch,
  },
  setSessionCookie,
  clearSessionCookie,
};

export default controller;
