import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_BACKEND_URL = 'https://prognimak-ordermanager-backend.azurewebsites.net/backend/';
const DEFAULT_MICROSERVICE_URL = 'http://localhost:8083/backend/';

const normalizeContextPath = (input: string | undefined): string => {
  if (!input || input.trim().length === 0) return '/frontend';
  const trimmed = input.trim();
  const prefixed = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return prefixed.endsWith('/') ? prefixed.slice(0, -1) : prefixed;
};

export type AppEnv = {
  port: number;
  contextPath: string;
  backendBaseUrl: string;
  staticDir: string;
};

export const loadEnv = (): AppEnv => {
  const microserviceUrl = process.env.BACKEND_MICROCERVICE_URL ?? DEFAULT_MICROSERVICE_URL;
  const backendBaseUrl = process.env.APP_BACKEND_URL ?? microserviceUrl ?? DEFAULT_BACKEND_URL;

  return {
    port: Number(process.env.PORT ?? 8085),
    contextPath: normalizeContextPath(process.env.CONTEXT_PATH),
    backendBaseUrl,
    staticDir: process.env.STATIC_DIR ?? path.resolve(__dirname, '../../public/static')
  };
};
