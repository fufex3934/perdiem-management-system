export class ErrorResponseDto {
  statusCode: number;
  error: string;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  path: string;
  timestamp: string;
  requestId: string;
}
