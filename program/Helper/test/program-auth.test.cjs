const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeApiBase, readConfiguredApiBase, requestProgramApi } = require('../electron/program-auth.cjs');

test('program API accepts HTTPS and local HTTP only', () => {
  assert.equal(normalizeApiBase('https://example.com/api/v1/program/'), 'https://example.com/api/v1/program');
  assert.equal(normalizeApiBase('http://127.0.0.1:8000/api/v1/program'), 'http://127.0.0.1:8000/api/v1/program');
  assert.throws(() => normalizeApiBase('http://example.com/api/v1/program'), /HTTPS/);
  assert.throws(() => normalizeApiBase('https://user:pass@example.com/api'), /учётные данные/);
});

test('packaged program ignores API override from environment', () => {
  assert.equal(readConfiguredApiBase({ isPackaged: true, resourcesPath: 'Z:/missing', appPath: 'Z:/missing', env: { GOVHELPER_API_URL: 'https://attacker.example/api' } }), 'http://127.0.0.1:8000/api/v1/program');
});

test('program API sends bearer token and parses successful response', async () => {
  const data = await requestProgramApi({
    baseUrl: 'https://example.com/api/v1/program', endpoint: '/me', token: 'secret',
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://example.com/api/v1/program/me');
      assert.equal(options.headers.Authorization, 'Bearer secret');
      assert.equal(options.redirect, 'error');
      assert.equal(options.cache, 'no-store');
      return new Response(JSON.stringify({ user: { email: 'agent@example.com' } }), { status: 200 });
    },
  });
  assert.equal(data.user.email, 'agent@example.com');
});

test('program API keeps server validation message', async () => {
  await assert.rejects(
    requestProgramApi({
      baseUrl: 'https://example.com/api/v1/program', endpoint: '/login', method: 'POST', body: {},
      fetchImpl: async () => new Response(JSON.stringify({ message: 'Неверная почта или пароль.' }), { status: 422 }),
    }),
    (error) => error.status === 422 && error.message === 'Неверная почта или пароль.',
  );
});
