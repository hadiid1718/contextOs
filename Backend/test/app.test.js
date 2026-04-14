import request from 'supertest';

import { app } from '../src/app.js';

describe('Backend App', () => {
  describe('GET /', () => {
    it('returns welcome message', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello From Stackmind API');
    });
  });

  describe('GET /health', () => {
    it('returns service health payload', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'ok',
        service: 'stackmind-api',
      });

      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('ingestion');
      expect(response.body).toHaveProperty('graph');
      expect(response.body).toHaveProperty('ai');
      expect(response.body).toHaveProperty('billing');

      expect(Number.isFinite(response.body.uptime)).toBe(true);
      expect(new Date(response.body.timestamp).toString()).not.toBe(
        'Invalid Date'
      );
    });
  });

  describe('Error handling', () => {
    it('returns 404 for unknown route', async () => {
      const response = await request(app).get('/route-that-does-not-exist');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Route not found');
    });

    it('returns 400 for invalid JSON payload', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"email":"bad-json"');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: 'Invalid JSON payload',
      });
    });
  });

  describe('Auth route contract (no DB dependency)', () => {
    it('returns 400 when login payload fails validation', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({
        email: 'not-an-email',
        password: 'short',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Validation failed');
    });

    it('returns 400 when register payload fails validation', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        name: 'A',
        email: 'invalid-email',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Validation failed');
    });

    it('returns 401 for /auth/me when no token is provided', async () => {
      const response = await request(app).get('/api/v1/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty(
        'message',
        'Authentication required'
      );
    });

    it('returns 401 for /auth/me with malformed token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer malformed.token.value');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty(
        'message',
        'Invalid or expired access token'
      );
    });

    it('returns 401 for /auth/refresh without refresh cookie', async () => {
      const response = await request(app).post('/api/v1/auth/refresh');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty(
        'message',
        'Refresh token is required'
      );
    });
  });
});
