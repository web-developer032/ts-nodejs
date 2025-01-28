import { NextFunction, Response } from "express";
import { HTTP_STATUS_CODES } from "../../constants";
import multer from "multer";
import { ALLOWED_IMAGE_FORMATS } from "../../types";
import ResponseHandler from "../../utils/response.handler";

const MAX_FILE_SIZE_MB = 6 * 1024 * 1024; // 6 MB

export const uploadAndValidateMemberProfileImage = (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  const upload = multer({ limits: { fileSize: MAX_FILE_SIZE_MB } }).single(
    "profileImage",
  );

  upload(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return ResponseHandler.sendError(
          res,
          "Profile image should not exceed 6 MB.",
        );
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return ResponseHandler.sendError(res, "Unexpected file format.");
      }
    }

    // Validate file format and size
    if (req.file) {
      if (!ALLOWED_IMAGE_FORMATS.includes(req.file.mimetype)) {
        return ResponseHandler.sendError(
          res,
          "Invalid file format. Only image formats are allowed.",
        );
      }
    }

    next();
  });
};
