import { expect, test } from '../../src/fixtures/baseFixture';
import { ApiClient } from '../../src/api/ApiClient';
import { DataGenerator } from '../../src/utils/DataGenerator';

/** Sample API tests against https://jsonplaceholder.typicode.com */
test.describe('Posts API @api', () => {
  test('GET single post', async ({ api }) => {
    const res = await api.get('/posts/1');
    ApiClient.expectStatus(res, 200);
    ApiClient.expectShape(res.body, { id: 'number', title: 'string', body: 'string', userId: 'number' });
    ApiClient.expectResponseTime(res, 5000);
  });

  test('GET with query params', async ({ api }) => {
    const res = await api.get<any[]>('/posts', { userId: 1 });
    ApiClient.expectStatus(res, 200);
    expect(res.body.every((p) => p.userId === 1)).toBe(true);
  });

  test('POST create post', async ({ api }) => {
    const payload = { title: DataGenerator.sentence(), body: DataGenerator.paragraph(), userId: 1 };
    const res = await api.post('/posts', payload);
    ApiClient.expectStatus(res, 201);
    expect(res.body).toMatchObject(payload);
  });

  test('DELETE post', async ({ api }) => {
    ApiClient.expectStatus(await api.delete('/posts/1'), 200);
  });
});
