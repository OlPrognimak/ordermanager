import { ArgumentsHost, Catch, ExceptionFilter, ForbiddenException } from '@nestjs/common';

@Catch(ForbiddenException)
export class ForbiddenExceptionFilter implements ExceptionFilter {
  catch(exception: ForbiddenException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse();
    response.status(403).json({ errorCode: 'CODE_20100', errorMessage: exception.message });
  }
}
