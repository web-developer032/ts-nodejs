import { ValidationError } from "express-validator";
import { HTTP_STATUS_CODES } from "../constants";
import { CustomError } from "../utils/error.handler";

export class RequestValidationError extends CustomError {
  statusCode = HTTP_STATUS_CODES.BAD_REQUEST;

  constructor(public errors: ValidationError[]) {
    super("Invalid request parameters");

    //Only bcoz we are extending a built in class
    Object.setPrototypeOf(this, RequestValidationError.prototype);
  }

  serializeErrors() {
    return this.errors.map((e) => {
      return { message: e.msg, field: e.param };
    });
  }
}
