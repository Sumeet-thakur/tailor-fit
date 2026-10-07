import type { Request, Response, NextFunction } from 'express';

interface ErrorWithStatus extends Error {
  statusCode?: number;
  code?: number;
}

const errorHandler = (
  err: ErrorWithStatus,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let error: { message: string; statusCode?: number } = { ...err, message: err.message };

  console.error(err);

  if (err.name === 'CastError') {
    error = { message: 'Resource not found', statusCode: 404 };
  }

  if ((err as { code?: number }).code === 11000) {
    error = { message: 'Duplicate field value entered', statusCode: 400 };
  }

  if (err.name === 'ValidationError') {
    const message = Object.values((err as { errors?: Record<string, { message: string }> }).errors || {})
      .map((val) => val.message)
      .join(', ');
    error = { message, statusCode: 400 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
  });
};

export default errorHandler;
