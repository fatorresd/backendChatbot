import { Request, Response, NextFunction } from 'express';

export interface CustomError extends Error {
  status?: number;
}

export const errorHandler = (
  err: CustomError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error('Error:', err.message);

  const status = err.status || 500;
  const message = err.message || 'Error interno del servidor';

  res.status(status).json({
    success: false,
    error: message,
    status,
  });
};

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};