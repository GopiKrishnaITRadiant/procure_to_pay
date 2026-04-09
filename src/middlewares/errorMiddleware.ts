import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { ENV } from "../config/env";

export const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {

  console.log('req.bodddd',req.originalUrl,err)

  let statusCode = err.statusCode ?? 500;
  let message = err.message ?? "Internal Server Error";
  let errorCode = err.errorCode ?? "INTERNAL_ERROR";
  let errors: any = null;

  /**
   * 🔹 1. Mongo Duplicate Key (11000)
   */
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = `${field} already exists`;
    errorCode = "DUPLICATE_KEY";
  }

  /**
   * 🔹 2. Mongoose Validation Error
   */
  else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    errorCode = "VALIDATION_ERROR";
    message = "Validation failed";

    errors = Object.values(err.errors).map((e: any) => ({
      field: e.path,
      message: e.message,
    }));
  }

  /**
   * 🔹 3. Invalid ObjectId (CastError)
   */
  else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
    errorCode = "INVALID_ID";
  }

  /**
   * 🔹 4. Document Not Found (.orFail())
   */
  else if (err.name === "DocumentNotFoundError") {
    statusCode = 404;
    message = "Resource not found";
    errorCode = "NOT_FOUND";
  }

  /**
   * 🔹 5. JWT Errors
   */
  else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
    errorCode = "UNAUTHORIZED";
  }

  else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
    errorCode = "TOKEN_EXPIRED";
  }

  /**
   * 🔹 Hide internal errors in production
   */
  if (ENV.NODE_ENV !== "production") {
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message,
      errorCode,
      // errors,
      originalMessage: err.message,
      request: {
        method: req.method,
        url: req.originalUrl,
      },
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errorCode,
    // errors,
    timestamp: new Date().toISOString(),
    // path: req.originalUrl,
  });
};