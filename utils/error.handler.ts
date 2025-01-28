import { NextFunction, Request, Response } from "express";
import { logError, logInfo } from "./logger";
import { replaceAllOccurenceInString } from "./utils";
import ResponseHandler from "./response.handler";
import { HTTP_STATUS_CODES } from "../constants";
import multer from "multer";

export abstract class CustomError extends Error {
  abstract statusCode: number;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, CustomError.prototype);
  }

  abstract serializeErrors(): {
    message: string;
    field?: string;
  }[];
}

class AppError extends Error {
  public statusCode: number;
  public status: boolean;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS_CODES.BAD_REQUEST,
  ) {
    super(message);

    this.statusCode = statusCode;
    this.status = false;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const handleDBCastError = (error: any) => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return new AppError(message, HTTP_STATUS_CODES.BAD_REQUEST);
};

const handleDBValidationError = (error: any) => {
  const errors = Object.values(error.errors).map((el: any) => el.message);

  const str = errors.join(" ");

  const pathToFieldReplace = replaceAllOccurenceInString(
    replaceAllOccurenceInString(str, "path", ""),
    "Path",
    "",
  );

  const removeEnum = replaceAllOccurenceInString(
    pathToFieldReplace,
    "enum",
    "",
  );

  const message = `Invalid data: ${removeEnum}`;
  return new AppError(message, HTTP_STATUS_CODES.BAD_REQUEST);
};

const handleDBDuplicateFieldsError = (error: any) => {
  let key: string = "";
  for (const k in error.keyValue) {
    key = k;
    break;
  }

  const value = error.keyValue?.[key];
  const message = `Duplicate field value: ${value}. Please try another ${key}! `;
  return new AppError(message, HTTP_STATUS_CODES.BAD_REQUEST);
};

const handleJWTError = () =>
  new AppError(
    "Invalid or Expired Token. Please Login again.",
    HTTP_STATUS_CODES.UNAUTHORIZED,
  );

const handleMulterError = (error: any) => {
  if (error.code === "LIMIT_UNEXPECTED_FILE") {
    return new AppError(`Maximum of 5 images are allowed!`);
  }
};

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // logError(`ERROR HANDLER-NAME:`, err.name);
  logError("ERROR HANDLER-MESSAGE:", err.message);
  logError("ERROR HANDLER-STACK: ", err);

  if (err.name === "BSONTypeError")
    err = {
      ...err,
      message: "Invalid ID",
    };

  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError")
    err = handleJWTError();

  if (err.name === "CastError") err = handleDBCastError(err);
  if (err.name === "ValidationError") err = handleDBValidationError(err);
  if (err.code === 11000) err = handleDBDuplicateFieldsError(err);

  if (err instanceof multer.MulterError) {
    err = handleMulterError(err);
  }

  if (err instanceof CustomError) {
    return ResponseHandler.sendError(
      res,
      err.serializeErrors()?.[0]?.message || "Something went wrong!",
      err.statusCode,
    );
  }

  try {
    if (!err?.message) {
      let key = Object.keys(err)?.[0];

      if (typeof err === "object" && err[key]) {
        err.message = err.base?.[0];
      }
    }
  } catch (error) {
    logError("ERROR HANDLER: ", error);
  }

  return ResponseHandler.sendError(res, err.message, err.statusCode);
};

export default AppError;
