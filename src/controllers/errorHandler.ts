import { Request, Response, NextFunction } from "express";
import HttpException from "../exceptions/HttpException";
import dotenv from "dotenv";
dotenv.config();

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  res.status(404);
  next(new HttpException(404, `${req.originalUrl} not found`));
};

export const errorHandler = (
  error: HttpException,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const response: object = { message: error.message };
  let status: number = 500;

  if (error?.status) {
    status = error.status;
  }

  if (process.env.NODE_ENV === "development") {
    Object.assign(response, { stack: error.stack });
  }

  res.status(status);
  res.json(response);
};

