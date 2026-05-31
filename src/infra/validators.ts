import { ValidationError } from "#infra/errors";

function checkEmptyPayload(providedFields: string[], allowedFields: string[]) {
  if (providedFields.length === 0) {
    throw new ValidationError({
      message: "No data provided in the request body.",
      action: `Please provide at least one valid field: ${allowedFields.join(", ")}.`,
    });
  }
}

function checkMissingFields(
  providedFields: string[],
  requiredFields: string[],
) {
  if (requiredFields.length === 0) return;

  const missingFields = requiredFields.filter(
    (field) => !providedFields.includes(field),
  );

  if (missingFields.length > 0) {
    throw new ValidationError({
      message: `Missing required fields: '${missingFields.join(", ")}'.`,
      action: "Please provide all mandatory fields to proceed.",
    });
  }
}

function checkUnrecognizedFields(
  providedFields: string[],
  allowedFields: string[],
) {
  const invalidFields = providedFields.filter(
    (field) => !allowedFields.includes(field),
  );

  if (invalidFields.length > 0) {
    const actionMessage =
      allowedFields.length > 0
        ? `Please remove these fields. The only allowed fields are: ${allowedFields.join(", ")}.`
        : "Please remove these fields. This endpoint does not accept any data in the request body.";

    throw new ValidationError({
      message: `Unrecognized or not allowed fields provided: '${invalidFields.join(", ")}'.`,
      action: actionMessage,
    });
  }
}

function validateNotBlank(value: unknown, fieldName: string) {
  if (value === undefined || value === null) return;

  if (String(value).trim() === "") {
    throw new ValidationError({
      message: `The field '${fieldName}' cannot be blank or empty.`,
      action: "Please provide a valid text value.",
    });
  }
}

function validateEmail(email: unknown, fieldName = "email") {
  if (!email) return;
  validateNotBlank(email, fieldName);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(String(email))) {
    throw new ValidationError({
      message: `The ${fieldName} format is invalid.`,
      action: "Please provide a valid email address.",
    });
  }
}

function validateUsername(username: unknown, fieldName = "username") {
  if (!username) return;
  validateNotBlank(username, fieldName);

  const usernameRegex = /^(?!.*__)[a-zA-Z0-9][a-zA-Z0-9_]{1,28}[a-zA-Z0-9]$/;
  if (!usernameRegex.test(String(username))) {
    throw new ValidationError({
      message: `The ${fieldName} provided is invalid.`,
      action:
        "Please ensure that the username is between 3 and 30 characters, contains only letters, numbers or underscores, does not start or end with underscores, and does not have two consecutive underscores.",
    });
  }
}

function validatePassword(password: unknown, fieldName = "password") {
  if (!password) return;
  validateNotBlank(password, fieldName);

  const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,100}$/;
  if (!passwordRegex.test(String(password))) {
    throw new ValidationError({
      message: `The ${fieldName} provided is too weak.`,
      action:
        "Please provide a password with at least 8 characters, including at least one number and one special character.",
    });
  }
}

type ValidationStrategy = (value: unknown, fieldName: string) => void;

const validationStrategies = new Map<string, ValidationStrategy>([
  ["email", validateEmail],
  ["username", validateUsername],
  ["password", validatePassword],
  ["notEmptyText", validateNotBlank],
]);

export type ValidationRuleType =
  | "email"
  | "username"
  | "password"
  | "notEmptyText";

export interface ValidationRule {
  type: ValidationRuleType;
  required?: boolean;
}

export type ValidatorSchema = Record<string, ValidationRule>;

function validate(
  payload: Record<string, unknown> | null | undefined,
  schema: ValidatorSchema,
) {
  const data = payload || {};
  const providedFields = Object.keys(data);
  const allowedFields = Object.keys(schema);

  const requiredFields = Object.entries(schema)
    .filter((entry) => entry[1].required)
    .map((entry) => entry[0]);

  const expectsEmptyBody = allowedFields.length === 0;

  if (!expectsEmptyBody) {
    checkEmptyPayload(providedFields, allowedFields);
  }

  checkMissingFields(providedFields, requiredFields);
  checkUnrecognizedFields(providedFields, allowedFields);

  Object.entries(schema).forEach(([field, rules]) => {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      const value = Reflect.get(data, field);

      if (value !== undefined && value !== null) {
        const strategy = validationStrategies.get(rules.type);

        if (strategy) {
          strategy(value, field);
        }
      }
    }
  });
}

const validator = {
  validate,
  validateNotBlank,
  validateEmail,
  validateUsername,
  validatePassword,
};

export default validator;
