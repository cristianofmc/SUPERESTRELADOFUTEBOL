interface BaseErrorOptions {
  cause?: unknown;
  message?: string;
  action?: string;
}

interface InternalServerErrorOptions {
  cause?: unknown;
  statusCode?: number;
}

interface ServiceErrorOptions extends BaseErrorOptions {
  context?: unknown;
}

export class InternalServerError extends Error {
  action: string;
  statusCode: number;

  constructor({ cause, statusCode }: InternalServerErrorOptions = {}) {
    super("An unexpected error occurred.", { cause });
    this.name = "InternalServerError";
    this.action = "Please contact the service administrator.";
    this.statusCode = statusCode || 500;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    };
  }
}

export class ServiceError extends Error {
  action: string;
  statusCode: number;
  context?: unknown;

  constructor({ cause, message, action, context }: ServiceErrorOptions = {}) {
    super(message || "Service currently unavailable.", { cause });
    this.name = "ServiceError";
    this.action = action || "Please contact the service administrator.";
    this.statusCode = 503;
    this.context = context;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
      context: this.context,
    };
  }
}

export class ValidationError extends Error {
  action: string;
  statusCode: number;

  constructor({ cause, message, action }: BaseErrorOptions = {}) {
    super(message || "A validation error occurred.", { cause });
    this.name = "ValidationError";
    this.action = action || "Please update the submitted data or try again.";
    this.statusCode = 400;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    };
  }
}

export class NotFoundError extends Error {
  action: string;
  statusCode: number;

  constructor({ cause, message, action }: BaseErrorOptions = {}) {
    super(message || "This feature could not be found in the system.", {
      cause,
    });
    this.name = "NotFoundError";
    this.action =
      action ||
      "Please verify that the parameters sent in the query are correct.";
    this.statusCode = 404;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    };
  }
}

export class UnauthorizedError extends Error {
  action: string;
  statusCode: number;

  constructor({ cause, message, action }: BaseErrorOptions = {}) {
    super(message || "Unauthenticated user.", { cause });
    this.name = "UnauthorizedError";
    this.action = action || "Please log in again to continue.";
    this.statusCode = 401;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    };
  }
}

export class ForbiddenError extends Error {
  action: string;
  statusCode: number;

  constructor({ cause, message, action }: BaseErrorOptions = {}) {
    super(message || "Access denied.", { cause });
    this.name = "ForbiddenError";
    this.action =
      action || "Please check the required features before continuing.";
    this.statusCode = 403;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    };
  }
}

export class MethodNotAllowedError extends Error {
  action: string;
  statusCode: number;

  constructor() {
    super("This method is not allowed for this endpoint.");
    this.name = "MethodNotAllowedError";
    this.action = "Please verify that the HTTP method is valid.";
    this.statusCode = 405;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    };
  }
}
