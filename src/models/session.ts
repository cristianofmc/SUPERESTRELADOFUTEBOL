import { UnauthorizedError } from "#infra/errors";
import crypto from "node:crypto";
import { eq, and, gt } from "drizzle-orm";
import { db } from "#infra/database";
import { sessions } from "#db/schema";

const EXPIRATION_IN_MILLISECONDS = 60 * 60 * 24 * 30 * 1000;
const COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Host-session_id" : "session_id";

async function create(userId: string) {
  const token = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + EXPIRATION_IN_MILLISECONDS);

  const [newSession] = await db
    .insert(sessions)
    .values({
      token,
      userId,
      expiresAt,
    })
    .returning();

  return newSession;
}

async function findOneValidByToken(sessionToken: string) {
  const [sessionFound] = await db
    .select()
    .from(sessions)
    .where(
      and(eq(sessions.token, sessionToken), gt(sessions.expiresAt, new Date())),
    )
    .limit(1);

  if (!sessionFound) {
    throw new UnauthorizedError({
      message: "The user does not have an active session.",
      action: "Please check if this user is logged in and try again.",
    });
  }

  return sessionFound;
}

async function renew(sessionId: string) {
  const newExpiresAt = new Date(Date.now() + EXPIRATION_IN_MILLISECONDS);

  const [updatedSession] = await db
    .update(sessions)
    .set({
      expiresAt: newExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, sessionId))
    .returning();

  return updatedSession;
}

async function expireById(sessionId: string) {
  const pastDate = new Date(0);

  const [expiredSession] = await db
    .update(sessions)
    .set({
      expiresAt: pastDate,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, sessionId))
    .returning();

  return expiredSession;
}

const session = {
  create,
  findOneValidByToken,
  renew,
  expireById,
  EXPIRATION_IN_MILLISECONDS,
  COOKIE_NAME,
};

export default session;
