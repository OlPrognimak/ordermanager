import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Spring compatibility contract', () => {
  it('exposes GET /frontend/backendUrl with {url}', async () => {
    vi.stubEnv('CONTEXT_PATH', '/frontend');
    vi.stubEnv('APP_BACKEND_URL', 'http://localhost:8083/backend/');

    const { app } = createApp();
    const response = await request(app).get('/frontend/backendUrl');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ url: 'http://localhost:8083/backend/' });
  });

  it('keeps Spring style fallback from BACKEND_MICROCERVICE_URL', async () => {
    vi.stubEnv('CONTEXT_PATH', '/frontend');
    vi.stubEnv('APP_BACKEND_URL', '');
    vi.stubEnv('BACKEND_MICROCERVICE_URL', 'https://example.invalid/backend/');

    const { app } = createApp();
    const response = await request(app).get('/frontend/backendUrl');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ url: 'https://example.invalid/backend/' });
  });

  it('exposes /frontend/management/health for runtime checks', async () => {
    vi.stubEnv('CONTEXT_PATH', '/frontend');
    const { app } = createApp();

    const response = await request(app).get('/frontend/management/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('UP');
  });
});
