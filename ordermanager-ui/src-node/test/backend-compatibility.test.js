"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const vitest_1 = require("vitest");
const app_1 = require("../src/app");
(0, vitest_1.afterEach)(() => {
    vitest_1.vi.unstubAllEnvs();
});
(0, vitest_1.describe)('Spring compatibility contract', () => {
    (0, vitest_1.it)('exposes GET /frontend/backendUrl with {url}', async () => {
        vitest_1.vi.stubEnv('CONTEXT_PATH', '/frontend');
        vitest_1.vi.stubEnv('APP_BACKEND_URL', 'http://localhost:8083/backend/');
        const { app } = (0, app_1.createApp)();
        const response = await (0, supertest_1.default)(app).get('/frontend/backendUrl');
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(response.body).toEqual({ url: 'http://localhost:8083/backend/' });
    });
    (0, vitest_1.it)('keeps Spring style fallback from BACKEND_MICROCERVICE_URL', async () => {
        vitest_1.vi.stubEnv('CONTEXT_PATH', '/frontend');
        vitest_1.vi.stubEnv('APP_BACKEND_URL', '');
        vitest_1.vi.stubEnv('BACKEND_MICROCERVICE_URL', 'https://example.invalid/backend/');
        const { app } = (0, app_1.createApp)();
        const response = await (0, supertest_1.default)(app).get('/frontend/backendUrl');
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(response.body).toEqual({ url: 'https://example.invalid/backend/' });
    });
    (0, vitest_1.it)('exposes /frontend/management/health for runtime checks', async () => {
        vitest_1.vi.stubEnv('CONTEXT_PATH', '/frontend');
        const { app } = (0, app_1.createApp)();
        const response = await (0, supertest_1.default)(app).get('/frontend/management/health');
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(response.body.status).toBe('UP');
    });
});
