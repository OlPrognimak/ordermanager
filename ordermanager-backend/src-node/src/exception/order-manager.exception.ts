import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, ErrorCodeMessage } from './error-code.enum';

export class OrderManagerException extends HttpException {
  constructor(
    public readonly errorCode: ErrorCode,
    message?: string,
    public readonly shortText?: string,
  ) {
    super(
      {
        shortText,
        errorMessage: message ?? ErrorCodeMessage[errorCode],
        errorCode: { errorCode, message: ErrorCodeMessage[errorCode] },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
