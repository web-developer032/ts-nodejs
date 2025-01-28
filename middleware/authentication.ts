import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import asyncHandler from "../utils/async.handler";
import AppError from "../utils/error.handler";
import { HTTP_STATUS_CODES } from "../constants";
import { logInfo } from "../utils/logger";
import { User, UserDocument, UserRole } from "../api/user/user.schema";

interface DecodedToken extends jwt.JwtPayload {
  id: string;
  customerId: string;
  role: UserRole;
  iat: number;
}

const verifyToken = (token: string): Promise<DecodedToken> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.JWT_SECRET!, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded as DecodedToken);
      }
    });
  });
};

const extractTokenFromRequest = (req: any) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    return req.headers.authorization.split(" ")[1];
  }

  return null;
};

export const getUserFromToken = async (req: any) => {
  let token = extractTokenFromRequest(req);
  // logInfo("token: ", token);

  if (!token) return null;

  // 2) VERIFY TOKEN
  const decoded = await verifyToken(token);
  // logInfo("decoded: ", decoded); // WILL PRINT THE ID OF DOCUMENT

  const user = (await User.findById(decoded.id)) as UserDocument & {
    changedPassword(JWTTimeStamp: number): boolean;
  };

  if (!user)
    throw new AppError(
      "User belonging to this token no longer exists.",
      HTTP_STATUS_CODES.UNAUTHORIZED,
    );

  // 4) CHECK IF USER CHANGED PASSWORD AFTER TOKEN WAS ISSUED
  if (user.changedPassword(decoded.iat))
    throw new AppError(
      "Password changed recently. Please Login again.",
      HTTP_STATUS_CODES.UNAUTHORIZED,
    );

  return user;
};

const isAuthenticated = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    // 1) CHECK TOKEN IF IT EXISTS
    let user = await getUserFromToken(req);

    if (!user) throw new AppError("Unauthorized. Invalid or Expire Token!");

    req.user = user;

    // GRANT ACCESS TO PROTECTED ROUTE
    next();
  },
);

export const restrictTo = (...allowedRoles: UserRole[]) =>
  asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const isAllowed = allowedRoles.includes(req.user.role);

    if (isAllowed) return next();

    throw new AppError(
      `Unauthorized. Only ${allowedRoles.join("s, ")} are allowed to perform this action.`,
      HTTP_STATUS_CODES.FORBIDDEN,
    );
  });

export default isAuthenticated;
