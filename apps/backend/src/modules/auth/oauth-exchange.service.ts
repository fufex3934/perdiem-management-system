import { randomUUID } from 'crypto';
import { HttpStatus, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ErrorCodes } from '@/common/constants/error-codes';
import { BusinessException } from '@/common/exceptions/business.exception';
import { AuthResponseDto } from './dto/auth-response.dto';

interface ExchangeEntry {
  response: AuthResponseDto;
  expiresAt: number;
}

const EXCHANGE_TTL_MS = 60_000;

@Injectable()
export class OAuthExchangeService implements OnModuleDestroy {
  private readonly codes = new Map<string, ExchangeEntry>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), 30_000);
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  createExchangeCode(response: AuthResponseDto): string {
    const code = randomUUID();
    this.codes.set(code, {
      response,
      expiresAt: Date.now() + EXCHANGE_TTL_MS,
    });
    return code;
  }

  consumeExchangeCode(code: string): AuthResponseDto {
    const entry = this.codes.get(code);
    this.codes.delete(code);

    if (!entry || entry.expiresAt < Date.now()) {
      throw new BusinessException(
        {
          code: ErrorCodes.INVALID_OAUTH_CODE,
          message: 'Invalid or expired OAuth exchange code',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return entry.response;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [code, entry] of this.codes.entries()) {
      if (entry.expiresAt < now) {
        this.codes.delete(code);
      }
    }
  }
}
