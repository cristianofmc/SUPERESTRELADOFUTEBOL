import { eq, gt, isNull, and } from "drizzle-orm";
import { db } from "#infra/database";
import { activationTokens } from "#db/schema";
import email from "#infra/email";
import config from "#infra/config";
import user from "#models/user";
import authorization from "#models/authorization";
import { ForbiddenError, NotFoundError } from "#infra/errors";
import type { AuthUser } from "#infra/middlewares/authenticate";

// ─── Internal DB Type ─────────────────────────────────────────────────────────

type DbActivationToken = typeof activationTokens.$inferSelect;

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPIRATION_IN_MILLISECONDS = 60 * 15 * 1000; // 15 minutes

// ─── Functions ────────────────────────────────────────────────────────────────

async function create(userId: string) {
  const expiresAt = new Date(Date.now() + EXPIRATION_IN_MILLISECONDS);

  const [newToken] = await db
    .insert(activationTokens)
    .values({ userId, expiresAt })
    .returning();

  return newToken;
}

async function findOneValidTokenById(tokenId: string) {
  const now = new Date();

  const [token] = await db
    .select()
    .from(activationTokens)
    .where(
      and(
        eq(activationTokens.id, tokenId),
        gt(activationTokens.expiresAt, now),
        isNull(activationTokens.usedAt),
      ),
    )
    .limit(1);

  if (!token) {
    throw new NotFoundError({
      message:
        "The activation token provided was not found in the system or has expired.",
      action: "Please create a new account.",
    });
  }

  return token;
}

async function markTokenAsUsed(activationTokenId: string) {
  const now = new Date();

  const [usedToken] = await db
    .update(activationTokens)
    .set({
      usedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(activationTokens.id, activationTokenId),
        gt(activationTokens.expiresAt, now),
        isNull(activationTokens.usedAt),
      ),
    )
    .returning();

  if (!usedToken) {
    throw new NotFoundError({
      message:
        "The activation token provided was not found in the system or has expired.",
      action: "Please create a new account.",
    });
  }

  return usedToken;
}

async function activateUserByUserId(userId: string) {
  const userToActivate = await user.findOneById(userId);

  if (
    !authorization.can(
      { id: userToActivate.id, features: userToActivate.features },
      "read:activation_token",
    )
  ) {
    throw new ForbiddenError({
      message: "You do not have permission to activate account.",
      action: "Please contact support if you believe this is an error.",
    });
  }

  const activatedUser = await user.setFeatures(userId, [
    "create:session",
    "read:session",
    "update:user",
  ]);

  return activatedUser;
}

async function sendEmailToUser(
  userObject: AuthUser & { username: string; email: string },
  activationToken: DbActivationToken,
) {
  await email.send({
    from: `${config.appName} <${config.appEmail}>`,
    to: userObject.email,
    subject: "Please activate your account.",
    text: `Hi ${userObject.username},
Welcome to ${config.appName},
please access the link below to activate your account:
${config.origin}/sign_up/activate/${activationToken.id}
If you did not sign up for an account with ${config.appName}, please ignore this email. No further action is required.
Best regards,
The ${config.appName} Team.
`,
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

const activation = {
  sendEmailToUser,
  create,
  findOneValidTokenById,
  markTokenAsUsed,
  activateUserByUserId,
  EXPIRATION_IN_MILLISECONDS,
};

export default activation;
