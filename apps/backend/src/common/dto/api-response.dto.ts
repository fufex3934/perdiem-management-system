export class ApiResponseDto<T = unknown> {
  success: boolean;
  data: T;
  timestamp: string;
  requestId: string;

  constructor(data: T, requestId: string) {
    this.success = true;
    this.data = data;
    this.timestamp = new Date().toISOString();
    this.requestId = requestId;
  }
}
