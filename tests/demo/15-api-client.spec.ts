import { expect, test } from '../../src/fixtures/baseFixture';
import { ApiClient } from '../../src/api/ApiClient';
import { TestDataManager } from '../../src/data/TestDataManager';

/** ApiClient against the QA Demo App REST API (CRUD, auth, upload, schema & timing checks). */
test.describe.serial('ApiClient @demo @api', () => {
  let createdId: number;

  test.beforeAll(async ({ request }) => {
    await request.post('/api/reset');
  });

  test('GET list, GET by id, query params, expectShape, expectResponseTime', async ({ demoApi }) => {
    const list = await demoApi.get<any[]>('/api/users');
    ApiClient.expectStatus(list, 200);
    expect(list.body.length).toBeGreaterThanOrEqual(3);
    ApiClient.expectResponseTime(list, 2000);

    const one = await demoApi.get('/api/users/1');
    ApiClient.expectStatus(one, 200);
    ApiClient.expectShape(one.body, { id: 'number', name: 'string', email: 'string', role: 'string', active: 'boolean' });

    const brokers = await demoApi.get<any[]>('/api/users', { role: 'Broker' });
    expect(brokers.body.every((u) => u.role === 'Broker')).toBe(true);
  });

  test('POST create (with test data tokens) and validation error', async ({ demoApi }) => {
    const payload = TestDataManager.json('demo/demo-data.json', 'apiUser');
    const created = await demoApi.post('/api/users', payload);
    ApiClient.expectStatus(created, 201);
    expect(created.body).toMatchObject(payload);
    createdId = created.body.id;

    const bad = await demoApi.post('/api/users', { name: 'No email' });
    ApiClient.expectStatus(bad, 400);
    expect(bad.body.error).toContain('required');
  });

  test('PUT replace, PATCH update', async ({ demoApi }) => {
    const put = await demoApi.put(`/api/users/${createdId}`, { name: 'Replaced User', email: 'replaced@demo.test', role: 'Broker' });
    ApiClient.expectStatus(put, 200);
    expect(put.body).toMatchObject({ id: createdId, name: 'Replaced User' });

    const patch = await demoApi.patch(`/api/users/${createdId}`, { active: false });
    ApiClient.expectStatus(patch, 200);
    expect(patch.body).toMatchObject({ name: 'Replaced User', active: false });
  });

  test('DELETE and 404 afterwards', async ({ demoApi }) => {
    ApiClient.expectStatus(await demoApi.delete(`/api/users/${createdId}`), 200);
    const gone = await demoApi.get(`/api/users/${createdId}`);
    ApiClient.expectStatus(gone, 404);
    expect(gone.ok).toBe(false);
  });

  test('auth: setBearerToken, setBasicAuth, setHeader', async ({ demoApi }) => {
    ApiClient.expectStatus(await demoApi.get('/api/secure'), 401);

    const login = await demoApi.post<{ token: string }>('/api/login', { username: 'admin', password: 'Admin@123' });
    ApiClient.expectStatus(login, 200);
    expect(login.headers['set-cookie']).toContain('session=active');

    demoApi.setBearerToken(login.body.token);
    demoApi.setHeader('X-Request-Id', 'qa-123'); // any custom header; setters are also chainable
    const secure = await demoApi.get('/api/secure');
    ApiClient.expectStatus(secure, 200);
    expect(secure.body.secret).toBe('classified');

    const basic = await demoApi.setBasicAuth('admin', 'Admin@123').get('/api/basic');
    expect(basic.body).toEqual({ auth: 'basic-ok' });
  });

  test('multipart upload', async ({ demoApi }) => {
    const res = await demoApi.upload('/api/upload', 'document', TestDataManager.resolveFile('files/policy-schedule.txt'), { policy: 'POL-1' });
    ApiClient.expectStatus(res, 200);
    expect(res.body).toMatchObject({ received: true, filename: 'policy-schedule.txt' });
  });

  test('expectStatus reports the response body on failure', async ({ demoApi }) => {
    const res = await demoApi.get('/api/users/999');
    expect(() => ApiClient.expectStatus(res, 200)).toThrow(/Expected HTTP 200 but got 404.*Not found/);
  });
});
