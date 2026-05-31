import { ValidationError, NotFoundError } from "#infra/errors";
import passwordService from "#models/password";
import { eq, sql } from "drizzle-orm";
import { db } from "#infra/database";
import { users } from "#db/schema";

const default_features = ["read:activation_token"];

export type CreateUserInput = {
  email: string;
  username: string;
  password: string;
};

export type UpdateUserInput = {
  email?: string;
  username?: string;
  password?: string;
};

async function create(updateData: CreateUserInput) {
  const email = updateData.email.toLowerCase();
  const username = updateData.username.toLowerCase();

  await validateUniqueEmail(email);
  await validateUniqueUsername(username);

  const hashedPassword = await passwordService.hash(updateData.password);
  const features = default_features;

  const [newUser] = await db
    .insert(users)
    .values({
      username,
      email,
      password: hashedPassword,
      features,
    })
    .returning();

  return newUser;
}

async function updateByUsername(
  currentUsername: string,
  updateData: UpdateUserInput,
) {
  const currentUser = await findOneByUsername(currentUsername);

  const newEmail = updateData.email?.toLowerCase();
  const newUsername = updateData.username?.toLowerCase();

  if (newEmail && newEmail !== currentUser.email) {
    await validateUniqueEmail(newEmail);
  }

  if (newUsername && newUsername !== currentUser.username) {
    await validateUniqueUsername(newUsername);
  }

  let hashedPassword = null;

  if (updateData.password) {
    const isSamePassword = await passwordService.compare(
      updateData.password,
      currentUser.password,
    );

    if (isSamePassword) {
      throw new ValidationError({
        message: "The new password cannot be the same as the current password.",
        action: "Please choose a different password to enhance your security.",
      });
    }

    hashedPassword = await passwordService.hash(updateData.password);
  }

  const updatePayload: Partial<typeof users.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (newUsername) updatePayload.username = newUsername;
  if (newEmail) updatePayload.email = newEmail;
  if (hashedPassword) updatePayload.password = hashedPassword;

  const [updatedUser] = await db
    .update(users)
    .set(updatePayload)
    .where(eq(users.id, currentUser.id))
    .returning();

  return updatedUser;
}

async function findOneByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (!user) {
    throw new NotFoundError({
      message: "The email provided was not found.",
      action: "Please check that the email was entered correctly.",
    });
  }

  return user;
}

async function findOneByUsername(username: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username.toLowerCase()))
    .limit(1);

  if (!user) {
    throw new NotFoundError({
      message: "The username provided was not found.",
      action: "Please check that the username was entered correctly.",
    });
  }

  return user;
}

async function findOneById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

  if (!user) {
    throw new NotFoundError({
      message: "The id provided was not found.",
      action: "Please check that the id was entered correctly.",
    });
  }

  return user;
}

async function validateUniqueEmail(email: string) {
  const exists = await existsByEmail(email);

  if (exists) {
    throw new ValidationError({
      message: "The email address provided is already registered.",
      action: "Please try again with a different email.",
    });
  }
}

async function validateUniqueUsername(username: string) {
  const exists = await existsByUsername(username);

  if (exists) {
    throw new ValidationError({
      message: "The username provided is already registered.",
      action: "Please try again with a different username.",
    });
  }
}

async function existsByEmail(email: string) {
  const [result] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  return !!result;
}

async function existsByUsername(username: string) {
  const [result] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username.toLowerCase()))
    .limit(1);

  return !!result;
}

async function setFeatures(userId: string, features: string[]) {
  const [updatedUser] = await db
    .update(users)
    .set({
      features,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return updatedUser;
}

async function addFeatures(userId: string, features: string[]) {
  const [updatedUser] = await db
    .update(users)
    .set({
      features: sql`array_cat(${users.features}, ARRAY[${sql.join(features, sql`, `)}]::text[])`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return updatedUser;
}

const user = {
  create,
  findOneByUsername,
  findOneByEmail,
  findOneById,
  updateByUsername,
  setFeatures,
  addFeatures,
};

export default user;
