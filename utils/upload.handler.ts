import multer, { FileFilterCallback, Multer } from "multer";
import AppError from "./error.handler";
import sharp from "sharp";
import fileUploadService from "../api/file-upload/file-upload.service";
import { logInfo } from "./logger";

const multerStorage = multer.memoryStorage();

const multerFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Invalid File, Please upload Image.") as any, false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

const uploadSingle = (fieldName: string) => upload.single(fieldName);
const uploadMultiples = (fields: { name: string; maxCount: number }[]) =>
  upload.fields(fields);

const resizeBuffer = (buffer: Buffer, width: number, height: number) =>
  sharp(buffer)
    .resize(width, height)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toBuffer();

const resizeAndUploadFile = async (
  file: Express.Multer.File,
  width: number,
  height: number,
  key: string,
  user: any,
) => {
  const resizedBuffer = await resizeBuffer(file.buffer, width, height);

  return fileUploadService.upload(
    resizedBuffer,
    `${key}-${String(user._id)}-${Date.now()}.${file.mimetype.split("/")[1]}`,
    `couple-${key}`,
  );
};

export {
  upload,
  uploadSingle,
  uploadMultiples,
  resizeBuffer,
  resizeAndUploadFile,
};
