import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';

export function createWinstonConfig(serviceName: string, logLevel: string) {
  const isProduction = process.env.NODE_ENV === 'production';

  const formats = isProduction
    ? winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      )
    : winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.colorize({ all: true }),
        nestWinstonModuleUtilities.format.nestLike(serviceName, {
          prettyPrint: true,
        }),
      );

  return {
    level: logLevel,
    transports: [
      new winston.transports.Console({
        format: formats,
      }),
    ],
  };
}
