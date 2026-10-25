const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const SERVERS = [
  ['atlanta', 'Atlanta'], ['boston', 'Boston'], ['chicago', 'Chicago'],
  ['dallas', 'Dallas'], ['denver', 'Denver'], ['detroit', 'Detroit'],
  ['houston', 'Houston'], ['las_vegas', 'Las Vegas'], ['los_angeles', 'Los Angeles'],
  ['memphis', 'Memphis'], ['miami', 'Miami'], ['newyork', 'New York'],
  ['orlando', 'Orlando'], ['phoenix', 'Phoenix'], ['portland', 'Portland'],
  ['san_diego', 'San Diego'], ['san_francisco', 'San Francisco'],
  ['seattle', 'Seattle'], ['washington', 'Washington'],
].map(([id, name]) => ({ id, name, file: `database_${id}.json` }));

const DEFAULT_SETTINGS = Object.freeze({
  server: 'denver',
  theme: 'base',
  opacity: 0.96,
  noteOpacity: 0.94,
  uiScale: 1,
  alwaysOnTop: false,
  compact: false,
  launchMinimized: false,
  toggleShortcut: 'F10',
  databaseManifestUrl: 'https://goshelper-ai.stas-l-z91.workers.dev/db/manifest',
});

const THEMES = new Set(['base', 'aurora', 'midnight', 'light']);
const MAX_JSON_BYTES = 32 * 1024 * 1024;
const ENCRYPTED_MAGIC = Buffer.from('GHGCM1');
const ENCRYPTED_AAD = Buffer.from('govhelper:user-state:v1');

function safeString(value, maxLength, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return String(value).slice(0, maxLength);
}

function finiteNumber(value, fallback, minimum, maximum) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
}

function sanitizeSettings(candidate) {
  const source = candidate && typeof candidate === 'object' ? candidate : {};
  const server = safeString(source.server, 40, DEFAULT_SETTINGS.server);
  const theme = safeString(source.theme, 20, DEFAULT_SETTINGS.theme);
  return {
    server: SERVERS.some((item) => item.id === server) ? server : DEFAULT_SETTINGS.server,
    theme: THEMES.has(theme) ? theme : DEFAULT_SETTINGS.theme,
    opacity: finiteNumber(source.opacity, DEFAULT_SETTINGS.opacity, 0.45, 1),
    noteOpacity: finiteNumber(source.noteOpacity, DEFAULT_SETTINGS.noteOpacity, 0.35, 1),
    uiScale: finiteNumber(source.uiScale, DEFAULT_SETTINGS.uiScale, 0.75, 1.35),
    alwaysOnTop: Boolean(source.alwaysOnTop),
    compact: Boolean(source.compact),
    launchMinimized: Boolean(source.launchMinimized),
    toggleShortcut: safeString(source.toggleShortcut, 80, DEFAULT_SETTINGS.toggleShortcut),
    databaseManifestUrl: safeString(
      source.databaseManifestUrl,
      2048,
      DEFAULT_SETTINGS.databaseManifestUrl,
    ),
  };
}

function sanitizeFavorites(candidate) {
  const source = candidate && typeof candidate === 'object' ? candidate : {};
  return Object.fromEntries(SERVERS.map(({ id }) => {
    const values = Array.isArray(source[id]) ? source[id] : [];
    return [id, [...new Set(values.slice(0, 2000)
      .filter((value) => typeof value === 'string' || typeof value === 'number')
      .map((value) => safeString(value, 160)).filter(Boolean))]];
  }).filter(([, values]) => values.length));
}

function sanitizeNotes(candidate) {
  const source = candidate && typeof candidate === 'object' ? candidate : {};
  return Object.fromEntries(SERVERS.map(({ id }) => {
    const values = Array.isArray(source[id]) ? source[id] : [];
    const seen = new Set();
    const notes = values.slice(0, 400).filter((note) => note && typeof note === 'object').map((note) => ({
      id: safeString(note.id, 100) || crypto.randomUUID(),
      title: safeString(note.title, 120, 'Заметка'),
      body: safeString(note.body, 20000),
      pinned: Boolean(note.pinned),
      createdAt: safeString(note.createdAt, 40, new Date().toISOString()),
      updatedAt: safeString(note.updatedAt, 40, safeString(note.createdAt, 40, new Date().toISOString())),
    })).filter((note) => {
      if (seen.has(note.id)) return false;
      seen.add(note.id);
      return true;
    }).slice(0, 200);
    return [id, notes];
  }).filter(([, values]) => values.length));
}

function sanitizeChats(candidate) {
  const source = candidate && typeof candidate === 'object' ? candidate : {};
  return Object.fromEntries(SERVERS.map(({ id }) => {
    const values = Array.isArray(source[id]) ? source[id] : [];
    const messages = values.slice(-500).filter((message) => message && typeof message === 'object').map((message) => ({
      id: safeString(message.id, 100) || crypto.randomUUID(),
      author: safeString(message.author, 80, 'Вы'),
      text: safeString(message.text, 4000),
      createdAt: safeString(message.createdAt, 40, new Date().toISOString()),
    }));
    return [id, messages];
  }).filter(([, values]) => values.length));
}

function sanitizeState(candidate) {
  const source = candidate && typeof candidate === 'object' ? candidate : {};
  return {
    version: 2,
    settings: sanitizeSettings(source.settings),
    favorites: sanitizeFavorites(source.favorites),
    notes: sanitizeNotes(source.notes),
    localChats: sanitizeChats(source.localChats),
  };
}

function readJson(file, fallback = null, maxBytes = MAX_JSON_BYTES) {
  try {
    if (fs.statSync(file).size > maxBytes) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(temporary, file);
}

function encryptData(value, key) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('Требуется 256-битный ключ шифрования.');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
  cipher.setAAD(ENCRYPTED_AAD);
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([ENCRYPTED_MAGIC, iv, cipher.getAuthTag(), ciphertext]);
}

function decryptData(payload, key) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('Требуется 256-битный ключ шифрования.');
  const bytes = Buffer.from(payload || []);
  if (bytes.length < ENCRYPTED_MAGIC.length + 28 || !bytes.subarray(0, ENCRYPTED_MAGIC.length).equals(ENCRYPTED_MAGIC)) {
    throw new Error('Зашифрованные данные повреждены.');
  }
  const ivStart = ENCRYPTED_MAGIC.length;
  const tagStart = ivStart + 12;
  const dataStart = tagStart + 16;
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, bytes.subarray(ivStart, tagStart), { authTagLength: 16 });
  decipher.setAAD(ENCRYPTED_AAD);
  decipher.setAuthTag(bytes.subarray(tagStart, dataStart));
  return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(dataStart)), decipher.final()]).toString('utf8'));
}

function writeBufferAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, value, { mode: 0o600 });
  fs.renameSync(temporary, file);
}

function flattenDatabase(raw, server) {
  if (!raw || typeof raw !== 'object' || !raw.codes || typeof raw.codes !== 'object') {
    throw new Error('Файл базы имеет неподдерживаемый формат.');
  }

  const codes = [];
  const articles = [];
  let articleIndex = 0;

  for (const [codeName, codeValue] of Object.entries(raw.codes).slice(0, 100)) {
    const codeId = `code-${codes.length}`;
    const chapters = [];
    for (const [chapterName, chapterArticles] of Object.entries(codeValue?.chapters || {}).slice(0, 250)) {
      const chapterId = `${codeId}-chapter-${chapters.length}`;
      const articleIds = [];
      for (const source of Array.isArray(chapterArticles) ? chapterArticles : []) {
        if (articleIndex >= 25000) break;
        const article = {
          uid: `${server.id}:${articleIndex++}`,
          serverId: server.id,
          codeId,
          code: safeString(codeName, 200),
          codeIcon: safeString(codeValue?.icon, 12, '§'),
          chapterId,
          chapter: safeString(chapterName, 200),
          id: safeString(source?.id, 120, 'Статья'),
          stars: safeString(source?.stars, 40),
          title: safeString(source?.title, 500),
          description: safeString(source?.description, 30000),
          punishment: safeString(source?.punishment, 5000),
          keywords: Array.isArray(source?.keywords)
            ? source.keywords.slice(0, 100).map((value) => safeString(value, 120))
            : [],
        };
        articleIds.push(article.uid);
        articles.push(article);
      }
      chapters.push({ id: chapterId, name: safeString(chapterName, 200), articleIds });
    }
    codes.push({ id: codeId, name: safeString(codeName, 200), icon: safeString(codeValue?.icon, 12, '§'), chapters });
  }

  return {
    server,
    comment: safeString(raw._comment, 10000),
    codes,
    articles,
    faq: Array.isArray(raw.faq) ? raw.faq.slice(0, 500).map((item) => ({
      q: safeString(item?.q, 1000),
      a: safeString(item?.a, 10000),
    })) : [],
    faqPk: Array.isArray(raw.faq_pk) ? raw.faq_pk.slice(0, 500).map((item) => ({
      q: safeString(item?.q, 1000),
      a: safeString(item?.a, 10000),
    })) : [],
  };
}

class UserStore {
  constructor(userDataDir, encryptionKey = null) {
    this.file = path.join(userDataDir, encryptionKey ? 'state.gcm' : 'state.json');
    this.legacyFile = path.join(userDataDir, 'state.json');
    this.encryptionKey = encryptionKey;
  }

  load() {
    let stored = {};
    try {
      if (this.encryptionKey && fs.existsSync(this.file)) stored = decryptData(fs.readFileSync(this.file), this.encryptionKey);
      else stored = readJson(this.legacyFile, {});
    } catch {
      stored = {};
    }
    if (this.encryptionKey && !fs.existsSync(this.file) && fs.existsSync(this.legacyFile)) {
      this.save(stored);
      try { fs.rmSync(this.legacyFile, { force: true }); } catch {}
    }
    return sanitizeState(stored);
  }

  save(candidate) {
    const safe = sanitizeState(candidate);
    if (this.encryptionKey) writeBufferAtomic(this.file, encryptData(safe, this.encryptionKey));
    else writeJsonAtomic(this.file, safe);
    return safe;
  }

  importLegacy(legacyDir) {
    if (!fs.existsSync(legacyDir)) throw new Error('Папка старого клиента не найдена.');
    const state = this.load();
    let favoritesCount = 0;
    let notesCount = 0;

    for (const server of SERVERS) {
      const favorites = readJson(path.join(legacyDir, `favorites_${server.id}.json`), []);
      if (Array.isArray(favorites) && favorites.length) {
        state.favorites[server.id] = [...new Set(favorites.map(String))];
        favoritesCount += state.favorites[server.id].length;
      }
      const regular = readJson(path.join(legacyDir, `notes_${server.id}.json`), []);
      const windows = readJson(path.join(legacyDir, `note_windows_${server.id}.json`), []);
      const combined = [...(Array.isArray(regular) ? regular : []), ...(Array.isArray(windows) ? windows : [])];
      if (combined.length) {
        state.notes[server.id] = combined.map((note, index) => {
          if (note && typeof note === 'object') {
            return {
              id: String(note.id || crypto.randomUUID()),
              title: String(note.title || `Заметка ${index + 1}`),
              body: String(note.body || note.text || ''),
              pinned: Boolean(note.pinned),
              createdAt: note.createdAt || new Date().toISOString(),
            };
          }
          return {
            id: crypto.randomUUID(),
            title: `Заметка ${index + 1}`,
            body: String(note),
            pinned: true,
            createdAt: new Date().toISOString(),
          };
        });
        notesCount += state.notes[server.id].length;
      }
    }

    const legacyConfig = readJson(path.join(legacyDir, 'config.json'), null);
    if (legacyConfig) {
      state.settings.server = String(legacyConfig.last_server || state.settings.server).replaceAll('-', '_');
      state.settings.theme = String(legacyConfig.theme || state.settings.theme);
      state.settings.opacity = Number(legacyConfig.opacity || state.settings.opacity);
      state.settings.uiScale = Number(legacyConfig.ui_scale || state.settings.uiScale);
    }
    this.save(state);
    return { favoritesCount, notesCount, state: this.load() };
  }
}

module.exports = {
  DEFAULT_SETTINGS,
  SERVERS,
  UserStore,
  flattenDatabase,
  readJson,
  writeJsonAtomic,
  encryptData,
  decryptData,
  sanitizeState,
};
