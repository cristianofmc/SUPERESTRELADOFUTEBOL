import { getCookie } from "hono/cookie";
import type { Context, Next } from "hono";
import session from "#models/session";
import user from "#models/user";

// ─── AuthUser ─────────────────────────────────────────────────────────────────
// The only user shape the HTTP layer knows about.
//
// id: string | null — anonymous users have no id. Authorization logic that
// compares user.id === resource.id safely returns false for null, meaning
// anonymous users own nothing without any extra null checks downstream.
//
// password is absent by design — only the fields the HTTP layer needs are
// explicitly set in context.set() below. Nothing sensitive ever enters the
// request context.
//
// features is string[] because the DB stores features as varchar[] and the
// anonymous user's features are hardcoded literals. Feature validation happens
// in authorization.ts via validateFeature(), not here at the type level.

export interface AuthUser {
  id: string | null;
  features: string[];
}

// ─── Anonymous User ───────────────────────────────────────────────────────────

const ANONYMOUS_USER: AuthUser = {
  id: null,
  features: ["read:activation_token", "create:session", "create:user"],
};

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function injectAnonymousOrUser(
  context: Context,
  next: Next,
): Promise<void> {
  const sessionToken = getCookie(context, session.COOKIE_NAME);

  if (!sessionToken) {
    context.set("user", ANONYMOUS_USER);
    return await next();
  }

  const sessionObject = await session.findOneValidByToken(sessionToken);
  const userObject = await user.findOneById(sessionObject.userId);

  context.set("user", {
    id: userObject.id,
    features: userObject.features,
  });

  await next();
}
