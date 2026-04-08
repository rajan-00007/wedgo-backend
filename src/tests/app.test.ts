import request from 'supertest';
import app from '../app';

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
});
