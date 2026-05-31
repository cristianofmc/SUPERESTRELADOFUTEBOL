import argon2 from "argon2";
import { InternalServerError } from "#infra/errors";

function getPepper(): Buffer {
  const pepperString = process.env.PASSWORD_PEPPER;

  if (!pepperString) {
    throw new InternalServerError({
      cause: new Error(
        "The PASSWORD_PEPPER environment variable is not defined.",
      ),
    });
  }

  return Buffer.from(pepperString);
}

export async function hash(password: string): Promise<string> {
  try {
    const pepperBuffer = getPepper();

    return await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
      secret: pepperBuffer,
    });
  } catch (error) {
    if (error instanceof InternalServerError) throw error;
    throw new InternalServerError({
      cause: error instanceof Error ? error : new Error(String(error)),
    });
  }
}

export async function compare(
  providedPassword: string,
  storedPassword: string,
): Promise<boolean> {
  try {
    const pepperBuffer = getPepper();

    return await argon2.verify(storedPassword, providedPassword, {
      secret: pepperBuffer,
    });
  } catch {
    return false;
  }
}

const passwordService = {
  hash,
  compare,
};

export default passwordService;
