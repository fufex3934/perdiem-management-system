function getRequiredEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
        'Set it in the monorepo root .env or apps/frontend/.env.local',
    );
  }
  return value;
}

export const env = {
  apiUrl: getRequiredEnv(
    'NEXT_PUBLIC_API_URL',
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:3001/api/v1'
      : undefined,
  ),
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
} as const;
