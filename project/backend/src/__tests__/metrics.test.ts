import request from 'supertest';
import app from '../index';

describe('Metrics Endpoints', () => {
  let token: string;

  beforeAll(async () => {
    const email = `metrics-${Date.now()}@example.com`;
    const reg = await request(app).post('/api/auth/register').send({ email, password: 'Test123!@#', name: 'Metrics User' });
    token = reg.body.token;
  });

  it('GET /api/metrics/overview should require auth', async () => {
    const res = await request(app).get('/api/metrics/overview');
    expect(res.status).toBe(401);
  });

  it('GET /api/metrics/overview returns shape with auth', async () => {
    const res = await request(app)
      .get('/api/metrics/overview')
      .set('Authorization', `Bearer ${token}`)
      .query({ startDate: '2024-01-01', endDate: '2024-12-31' });
    expect([200, 204]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('metrics');
      expect(res.body.metrics).toHaveProperty('totalRevenue');
      expect(res.body.metrics).toHaveProperty('totalOrders');
    }
  });
});


