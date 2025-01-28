import { Response } from "express";
import { HTTP_STATUS_CODES } from "../constants";

class ResponseHandler {
  static sendSuccess(
    res: Response,
    message = "Success",
    data: any = undefined,
    statusCode = HTTP_STATUS_CODES.OK,
  ) {
    const response = {
      status: true,
      message,
      data,
    };
    return res.status(statusCode).json(response);
  }

  static sendError(
    res: Response,
    errorMessage = "Failed",
    statusCode = HTTP_STATUS_CODES.BAD_REQUEST,
  ) {
    const response = {
      status: false,
      message: errorMessage,
    };
    return res.status(statusCode).json(response);
  }
}

export default ResponseHandler;
