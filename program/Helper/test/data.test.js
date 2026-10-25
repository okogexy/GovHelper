import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { searchArticles } from '../src/lib/search.js';

const require = createRequire(import.meta.url);
const { decryptData, encryptData, flattenDatabase, sanitizeState, SERVERS, UserStore } = require('../electron/data.cjs');

test('Denver database is parsed and searchable', () => {
  const server = SERVERS.find((item) => item.id === 'denver');
  const raw = JSON.parse(fs.readFileSync(path.resolve('resources/databases/database_denver.json'), 'utf8'));
  const database = flattenDatabase(raw, server);
  assert.ok(database.articles.length > 500);
  assert.ok(database.codes.length > 10);
  assert.ok(Array.isArray(database.faq));
  const results = searchArticles(database.articles, '12.8 оружие');
  assert.ok(results.length > 0);
  assert.match(results[0].id, /12\.8/);
});

test('all 19 server files are present and valid', () => {
  for (const server of SERVERS) {
    const file = path.resolve('resources/databases', server.file);
    assert.equal(fs.existsSync(file), true, server.file);
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    const sourceArticles = Object.values(raw.codes || {}).flatMap((code) =>
      Object.values(code?.chapters || {}).flatMap((articles) => Array.isArray(articles) ? articles : []),
    );
    const data = flattenDatabase(raw, server);
    assert.ok(data.articles.length > 100, server.name);
    assert.equal(data.articles.length, sourceArticles.length, `${server.name}: статья потеряна при загрузке`);
    assert.deepEqual(
      data.articles.map((article) => article.title),
      sourceArticles.map((article) => String(article?.title || '').slice(0, 500)),
      `${server.name}: название статьи изменено при загрузке`,
    );
  }
});

test('user state is sanitized and bounded before persistence', () => {
  const oversizedNotes = Array.from({ length: 260 }, (_, index) => ({
    id: `note-${index}`,
    title: 't'.repeat(300),
    body: 'b'.repeat(21000),
    pinned: index % 2,
  }));
  const safe = sanitizeState({
    settings: { server: '../invalid', theme: 'unknown', opacity: 99, uiScale: -5, chatApiKey: 'secret' },
    favorites: { denver: ['a', 'a', { bad: true }], unknown: ['x'] },
    notes: { denver: [...oversizedNotes.slice(0, 2), oversizedNotes[0], ...oversizedNotes.slice(2)], unknown: oversizedNotes },
    localChats: { denver: [{ text: 'x'.repeat(5000) }] },
  });
  assert.equal(safe.settings.server, 'denver');
  assert.equal(safe.settings.theme, 'base');
  assert.equal(safe.settings.opacity, 1);
  assert.equal(safe.settings.uiScale, 0.75);
  assert.equal(Object.hasOwn(safe.settings, 'chatApiKey'), false);
  assert.deepEqual(safe.favorites.denver, ['a']);
  assert.equal(safe.notes.denver.length, 200);
  assert.equal(safe.notes.denver[0].title.length, 120);
  assert.equal(safe.notes.denver[0].body.length, 20000);
  assert.equal(typeof safe.notes.denver[0].updatedAt, 'string');
  assert.equal(safe.notes.denver[1].pinned, true);
  assert.equal(safe.localChats.denver[0].text.length, 4000);
  assert.equal(Object.hasOwn(safe.notes, 'unknown'), false);
});

test('UserStore recovers from malformed state', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gos-helper-test-'));
  try {
    fs.writeFileSync(path.join(directory, 'state.json'), '{broken', 'utf8');
    const state = new UserStore(directory).load();
    assert.equal(state.settings.server, 'denver');
    assert.equal(state.settings.theme, 'base');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('UserStore encrypts state with authenticated AES-256-GCM', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gos-helper-encrypted-'));
  const key = crypto.randomBytes(32);
  try {
    const store = new UserStore(directory, key);
    store.save({ settings: { server: 'denver' }, notes: { denver: [{ title: 'Секрет', body: 'Текст' }] } });
    const bytes = fs.readFileSync(store.file);
    assert.equal(bytes.includes(Buffer.from('Секрет')), false);
    assert.equal(store.load().notes.denver[0].body, 'Текст');
    const envelope = encryptData({ token: 'secret' }, key);
    assert.equal(decryptData(envelope, key).token, 'secret');
    envelope[envelope.length - 1] ^= 1;
    assert.throws(() => decryptData(envelope, key));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
