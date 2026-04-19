export class AppError extends Error {
  constructor(message) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
  }
}
