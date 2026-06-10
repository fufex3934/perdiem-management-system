import { HttpException, HttpStatus } from '@nestjs/common';

export interface BusinessExceptionPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class BusinessException extends HttpException {
  constructor(
    payload: BusinessExceptionPayload,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        statusCode: status,
        error: 'Business Error',
        ...payload,
      },
      status,
    );
  }
}
