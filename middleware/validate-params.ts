import { NextFunction, Response } from "express";
import asyncHandler from "../utils/async.handler";
import { isValidObjectId, Document, Model } from "mongoose";
import AppError from "../utils/error.handler";
import { HTTP_STATUS_CODES } from "../constants";
import { User } from "../api/user/user.schema";

export const validateIsObjectId =
  (...params: string[]) =>
  (req: any, res: Response, next: NextFunction) => {
    for (const param of params) {
      if (!isValidObjectId(req.params[param]))
        throw new AppError(
          `Invalid parameter value for ${param}`,
          HTTP_STATUS_CODES.BAD_REQUEST,
        );
    }

    next();
  };
// validateIsObjectId("oneId", "twoId"),

const validateIsExist = <T extends Document>(
  Model: Model<T>,
  id: string,
  errorMessage: string,
) =>
  asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const idToCheck = req.params[id];

    if (!isValidObjectId(idToCheck))
      throw new AppError(
        `Invalid parameter value for ${id}`,
        HTTP_STATUS_CODES.BAD_REQUEST,
      );

    const document = await Model.findById(idToCheck).lean();

    if (!document)
      throw new AppError(errorMessage, HTTP_STATUS_CODES.NOT_FOUND);

    // * ATTACHING IT TO REQUEST BECAUSE THEN WE DON'T HAVE TO AGAIN CALL FOR THE DOCUMENT IN THE NEXT FUNCTION
    const key = id.slice(0, -2); // memberId => member
    req[key] = document;

    next();
  });

export const validateParamUserId = validateIsExist(
  User,
  "userId",
  "User not found!",
);

export default validateIsExist;
