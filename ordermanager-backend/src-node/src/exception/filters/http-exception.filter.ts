import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    response.status(HttpStatus.BAD_REQUEST).json({
      shortText: 'Unexpected error',
      errorMessage: exception instanceof Error ? exception.message : 'Unexpected error',
      errorCode: { errorCode: -1, message: 'Unexpected error' },
    });
  }
}
