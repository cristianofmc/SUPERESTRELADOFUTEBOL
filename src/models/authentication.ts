import user from "#models/user";
import password from "#models/password";
import { NotFoundError, UnauthorizedError } from "#infra/errors";

async function getAuthenticatedUser(
  providedEmail: string,
  providedPassword: string,
) {
  try {
    const userFound = await findUserByEmail(providedEmail);
    await validatePassword(providedPassword, userFound.password);
    return userFound;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw new UnauthorizedError({
        message: "Incorrect authentication data.",
        action: "Please verify that the submitted data is correct.",
        cause: error,
      });
    }
    throw error;
  }
}

async function findUserByEmail(providedEmail: string) {
  try {
    return await user.findOneByEmail(providedEmail);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new UnauthorizedError({
        message: "Incorrect email sent.",
        action: "Please verify that the submitted data is correct.",
        cause: error,
      });
    }
    throw error;
  }
}

async function validatePassword(
  providedPassword: string,
  foundPassword: string,
) {
  const correctPasswordMatch = await password.compare(
    providedPassword,
    foundPassword,
  );

  if (!correctPasswordMatch) {
    throw new UnauthorizedError({
      message: "Incorrect password sent.",
      action: "Please verify that the submitted data is correct.",
    });
  }
}

const authentication = {
  getAuthenticatedUser,
};

export default authentication;
