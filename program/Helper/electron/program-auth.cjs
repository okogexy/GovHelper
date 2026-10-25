const fs = require('node:fs');
const path = require('node:path');

const LOCAL_API = 'http://127.0.0.1:8000/api/v1/program';
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function normalizeApiBase(value) {
  let url;
  try { url = new URL(String(value || LOCAL_API).trim()); }
  catch { throw new Error('Некорректный адрес API программы.'); }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && LOOPBACK_HOSTS.has(host))) {
    throw new Error('API программы должен использовать HTTPS. HTTP разрешён только локально.');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('Адрес API не должен содержать учётные данные, параметры или фрагмент.');
  }
  url.pathname = `/${url.pathname.replace(/^\/+|\/+$/g, '')}`;
  return url.href.replace(/\/$/, '');
}

function readConfiguredApiBase({ isPackaged, resourcesPath, appPath, env = process.env }) {
  if (!isPackaged && env.GOVHELPER_API_URL) return normalizeApiBase(env.GOVHELPER_API_URL);
  const candidates = isPackaged
    ? [path.join(resourcesPath, 'config', 'program.json')]
    : [path.join(appPath, 'resources', 'config', 'program.local.json')];
  for (const file of candidates) {
    try {
      const config = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (config.apiUrl) return normalizeApiBase(config.apiUrl);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw new Error(`Не удалось прочитать настройки API: ${error.message}`);
    }
  }
  return LOCAL_API;
}

async function readTextLimited(response, maximum = 1024 * 1024) {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maximum) throw new Error('Слишком большой ответ сервера.');
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximum) {
      await reader.cancel();
      throw new Error('Слишком большой ответ сервера.');
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total).toString('utf8');
}

async function requestProgramApi({ baseUrl, endpoint, token, method = 'GET', body, fetchImpl = fetch }) {
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  try {
    response = await fetchImpl(`${normalizeApiBase(baseUrl)}${endpoint}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
      cache: 'no-store',
      credentials: 'omit',
    });
  } catch (error) {
    if (error?.name === 'TimeoutError') throw new Error('Сайт не ответил вовремя.');
    throw new Error('Не удалось подключиться к сайту. Проверьте, что сервер запущен и адрес API указан верно.');
  }
  const text = await readTextLimited(response);
  let data = {};
  try { data = text ? JSON.parse(text) : {}; }
  catch { throw new Error('Сайт вернул некорректный ответ.'); }
  if (!response.ok) {
    const error = new Error(String(data.message || `Ошибка сайта: ${response.status}`));
    error.status = response.status;
    throw error;
  }
  return data;
}

module.exports = { LOCAL_API, normalizeApiBase, readConfiguredApiBase, requestProgramApi };
