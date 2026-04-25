import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-code.enum';

export class OrderManagerException extends HttpException {
  constructor(
    public readonly errorCode: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ errorCode, errorMessage: message }, status);
  }
}
