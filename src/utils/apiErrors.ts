export class ApiError extends Error {
  public statusCode: number;
  public errorCode?: string;
  public details?: any;

  constructor(
    statusCode: number,
    message: string,
    errorCode?: string,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode||'';
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}