import request from 'supertest';
import app from '../app';
import logger from '../utils/logger';

jest.mock('../utils/logger');

describe('App Heat Check', () => {
  it('should return 200 OK for the health check endpoint', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'UP',
    });
  });

  it('should return 200 OK for the root endpoint', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body.status).toBe('success');
  });

  describe('CORS Logic (Lines 28-37)', () => {
    const originalEnv = process.env.NODE_ENV;

    afterAll(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should allow allowed origins (Line 28-31)', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('should allow any origin in development (Line 33-36)', async () => {
      process.env.NODE_ENV = 'development';
      const res = await request(app)
        .get('/health')
        .set('Origin', 'http://unknown-origin.com');
      expect(res.headers['access-control-allow-origin']).toBe('http://unknown-origin.com');
    });

    it('should disallow unknown origins in production (Line 37)', async () => {
      process.env.NODE_ENV = 'production';
      const res = await request(app)
        .get('/health')
        .set('Origin', 'http://malicious-site.com');
      
      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Not allowed by CORS');
    });

    it('should allow requests with no origin (Line 27)', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
    });
  });

  describe('Error Handling Middleware (Lines 79-80)', () => {
    it('should handle CORS error response (Exercises Line 79-80)', async () => {
        process.env.NODE_ENV = 'production';
        const res = await request(app)
          .get('/health')
          .set('Origin', 'http://malicious-site.com');
        
        expect(res.status).toBe(500);
        expect(res.body.status).toBe('error');
        expect(res.body.message).toBe('Not allowed by CORS');
        expect(logger.error).toHaveBeenCalled();
    });

    it('should handle error with empty message (Line 82 fallback)', async () => {
        // Mock a route that exists (health check) or use a simpler approach
        // We'll use a route that was already defined in app.ts to ensure it's before the error handler
        const res = await request(app).get('/api/auth/non-existent');
        // A 404 is not an error in Express unless next(err) is called.
        // So we'll trigger a real error by mocking a controller.
        
        // Re-using the logic but ensuring it hits the handler:
        const authController = require('../controllers/authController').default;
        const spy = jest.spyOn(authController, 'sendOTP').mockImplementation(() => {
            const err = new Error();
            err.message = '';
            throw err;
        });

        const response = await request(app).post('/api/auth/send-otp').send({ phoneNumber: '123' });
        expect(response.status).toBe(500);
        expect(response.body.message).toBe('Something went wrong!');
        spy.mockRestore();
    });
  });
});
