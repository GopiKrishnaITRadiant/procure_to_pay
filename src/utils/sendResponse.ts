import { Response } from "express";

interface SuccessOptions<T> {
  res: Response;
  statusCode?: number;
  message?: string;
  data?: T;
  meta?: any;
}

export const sendResponse = <T>({
  res,
  statusCode = 200,
  message = "Success",
  data,
  meta,
}: SuccessOptions<T>) => {
  return res.status(statusCode).json({
    success: true,
    statusCode,
    message,
    data: data ?? null,
    meta: meta ?? null,
    // timestamp: new Date().toISOString(),
  });
};