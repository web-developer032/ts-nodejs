import { Request, Response, NextFunction } from "express";

// Define a type for the async function
type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<any>;

/**
 * Middleware that wraps a route handler in a try-catch and
 * automatically passes any errors to the next middleware.
 */

function asyncHandler(func: AsyncRequestHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    func(req, res, next).catch(next); // catch will automatically pass error in next function
  };
}

export default asyncHandler;
