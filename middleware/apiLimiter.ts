import rateLimit from "express-rate-limit";
import ResponseHandler from "../utils/response.handler";
import { HTTP_STATUS_CODES } from "../constants";

const mins = 1;
const apiLimiter = rateLimit({
  max: 50, // 50 requests per minute
  windowMs: mins * 60 * 1000,
  message: `Too many requests detected from your IP! Please try again after ${mins} minute.`,
  handler: (req, res) => {
    return ResponseHandler.sendError(
      res,
      `Too many requests from this IP, please try again after ${mins} minute.`,
      HTTP_STATUS_CODES.TOO_MANY_REQUESTS,
    );
  },
});

export default apiLimiter;
