const { app, BrowserWindow, dialog, globalShortcut, ipcMain, safeStorage, session, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const dns = require('node:dns').promises;
const net = require('node:net');
const { pathToFileURL } = require('node:url');
const crypto = require('node:crypto');
const os = require('node:os');
const { SERVERS, UserStore, decryptData, encryptData, flattenDatabase, readJson, writeJsonAtomic } = require('./data.cjs');
const { readConfiguredApiBase, requestProgramApi } = require('./program-auth.cjs');

const LEGACY_DIR = path.join(app.getPath('home'), 'Desktop', 'GosHelper');
let mainWindow;
let store;
const noteWindows = new Map();
const databaseCache = new Map();
let toggleShortcut = '';
let programToken = null;
let programUser = null;
let dataEncryptionKey = null;
const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) app.quit();
else app.on('second-instance', () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    if (app.isReady()) createMainWindow();
    return;
  }
  mainWindow.show();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

function toggleMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  let releasedNote = null;
  for (const window of noteWindows.values()) {
    if (!window.isDestroyed() && window._clickThrough) {
      setNotePinned(window, false);
      releasedNote ||= window;
    }
  }
  if (mainWindow._clickThrough) {
    setMainClickThrough(mainWindow, false);
    mainWindow.show();
    mainWindow.focus();
    return;
  }
  if (releasedNote) {
    releasedNote.show();
    releasedNote.focus();
    return;
  }
  if (mainWindow.isVisible()) mainWindow.hide();
  else {
    mainWindow.show();
    mainWindow.focus();
  }
}

function registerToggleShortcut(accelerator) {
  const next = String(accelerator || '').trim();
  const previous = toggleShortcut;
  if (previous) globalShortcut.unregister(previous);
  toggleShortcut = '';
  if (!next) return { ok: true, accelerator: '' };
  const parts = next.split('+');
  const key = parts.at(-1);
  const validKey = /^F(?:[1-9]|1\d|2[0-4])$/i.test(key)
    || /^[A-Z0-9]$/i.test(key)
    || ['Space', 'Tab', '\\', '/'].includes(key);
  const validModifiers = parts.slice(0, -1).every((part) =>
    ['CommandOrControl', 'Ctrl', 'Alt', 'Shift', 'Command', 'Super'].includes(part),
  );
  const validWithoutModifier = /^F(?:[1-9]|1\d|2[0-4])$/i.test(key) || key === '\\' || key === '/';
  const valid = validKey && validModifiers && (parts.length > 1 || validWithoutModifier);
  if (!valid || !globalShortcut.register(next, toggleMainWindow)) {
    if (previous && globalShortcut.register(previous, toggleMainWindow)) toggleShortcut = previous;
    return { ok: false, accelerator: toggleShortcut, error: 'Сочетание недоступно или уже занято.' };
  }
  toggleShortcut = next;
  return { ok: true, accelerator: next };
}

function databaseDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'databases')
    : path.join(__dirname, '..', 'resources', 'databases');
}

function databaseFile(server) {
  const override = path.join(app.getPath('userData'), 'databases', server.file);
  return fs.existsSync(override) ? override : path.join(databaseDir(), server.file);
}

function loadDatabase(server) {
  const file = databaseFile(server);
  const stat = fs.statSync(file);
  const signature = `${file}:${stat.size}:${stat.mtimeMs}`;
  const cached = databaseCache.get(server.id);
  if (cached?.signature === signature) return cached.database;
  const raw = readJson(file, null);
  if (!raw) throw new Error(`База ${server.name} не найдена или повреждена.`);
  const database = flattenDatabase(raw, server);
  databaseCache.set(server.id, { signature, database });
  while (databaseCache.size > 3) databaseCache.delete(databaseCache.keys().next().value);
  return database;
}

function rendererUrl(query = '') {
  if (process.env.VITE_DEV_SERVER_URL) return `${process.env.VITE_DEV_SERVER_URL}${query}`;
  return { file: path.join(__dirname, '..', 'dist', 'index.html'), query };
}

function loadRenderer(window, query = '') {
  const target = rendererUrl(query);
  if (typeof target === 'string') return window.loadURL(target);
  return window.loadFile(target.file, { query: Object.fromEntries(new URLSearchParams(query.replace(/^\?/, ''))) });
}

function isAllowedRendererUrl(url) {
  try {
    const target = new URL(url);
    if (process.env.VITE_DEV_SERVER_URL) {
      return target.origin === new URL(process.env.VITE_DEV_SERVER_URL).origin;
    }
    const renderer = pathToFileURL(path.join(__dirname, '..', 'dist', 'index.html'));
    return target.protocol === 'file:' && target.pathname === renderer.pathname;
  } catch {
    return false;
  }
}

function secureWindow(window) {
  window.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const target = new URL(url);
      if (target.protocol === 'https:' && !target.username && !target.password) {
        void shell.openExternal(target.href);
      }
    } catch {}
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedRendererUrl(url)) event.preventDefault();
  });
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());
  window.webContents.on('render-process-gone', (_event, details) => {
    if (details.reason !== 'clean-exit') {
      dialog.showErrorBox('Ошибка GOVHelper', 'Интерфейс аварийно завершился. Перезапустите программу.');
    }
  });
}

function handleRendererLoad(window, promise) {
  promise.catch((error) => {
    console.error('Renderer load failed:', error);
    dialog.showErrorBox(
      'Ошибка запуска GOVHelper',
      'Не удалось загрузить интерфейс программы. Переустановите приложение из последней сборки.',
    );
    if (!window.isDestroyed()) window.close();
  });
}

function setMainAlwaysOnTop(window, value) {
  if (!window || window.isDestroyed()) return false;
  const enabled = Boolean(value);
  window.setAlwaysOnTop(enabled, enabled ? 'screen-saver' : 'normal');
  if (enabled) window.moveTop();
  return window.isAlwaysOnTop();
}

function setMainClickThrough(window, value) {
  if (!window || window.isDestroyed() || window !== mainWindow) return false;
  const enabled = Boolean(value);
  if (enabled && !toggleShortcut) return false;
  window._clickThrough = enabled;
  if (enabled) window.setIgnoreMouseEvents(true, { forward: true });
  else window.setIgnoreMouseEvents(false);
  window.setFocusable(!enabled);
  if (!enabled) {
    window.show();
    window.focus();
  }
  if (!window.webContents.isDestroyed()) {
    window.webContents.send('window:click-through-changed', enabled);
  }
  return enabled;
}

function setMainCompact(window, value) {
  if (!window || window.isDestroyed()) return false;
  const compact = Boolean(value);
  if (window._compact === compact) return compact;
  if (compact) {
    if (!window.isMaximized()) window._expandedBounds = window.getBounds();
    if (window.isMaximized()) window.unmaximize();
    window.setSize(430, Math.max(600, Math.min(760, window.getBounds().height)), true);
  } else {
    const previous = window._expandedBounds;
    window.setSize(Math.max(900, previous?.width || 1180), Math.max(620, previous?.height || 760), true);
  }
  window._compact = compact;
  return compact;
}

function createMainWindow() {
  const state = store.load();
  mainWindow = new BrowserWindow({
    width: state.settings.compact ? 430 : 1180,
    height: state.settings.compact ? 680 : 760,
    minWidth: 390,
    minHeight: 560,
    show: false,
    frame: false,
    transparent: false,
    backgroundColor: '#090b12',
    title: 'Veyron • GovHelper',
    autoHideMenuBar: true,
    alwaysOnTop: Boolean(state.settings.alwaysOnTop),
    opacity: Number(state.settings.opacity) || 0.96,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !app.isPackaged,
      spellcheck: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });
  secureWindow(mainWindow);
  mainWindow._compact = Boolean(state.settings.compact);
  mainWindow._clickThrough = false;
  setMainAlwaysOnTop(mainWindow, state.settings.alwaysOnTop);
  mainWindow.once('ready-to-show', () => {
    if (!state.settings.launchMinimized) mainWindow.show();
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
    closeAllNoteWindows();
  });
  handleRendererLoad(mainWindow, loadRenderer(mainWindow));
}

function normalizeNotePayload(note) {
  const currentServer = store?.load()?.settings?.server;
  const requestedServer = String(note?.serverId || currentServer || 'phoenix');
  const serverId = SERVERS.some((server) => server.id === requestedServer) ? requestedServer : currentServer;
  return {
    id: String(note?.id || crypto.randomUUID()).slice(0, 100),
    serverId,
    title: String(note?.title || 'Заметка').slice(0, 120),
    body: String(note?.body || '').slice(0, 20000),
    pinned: Boolean(note?.pinned),
  };
}

function noteWindowKey(note) {
  return `${note.serverId}:${note.id}`;
}

function syncNoteWindow(note) {
  const safeNote = normalizeNotePayload(note);
  const existing = noteWindows.get(noteWindowKey(safeNote));
  if (!existing || existing.isDestroyed()) return false;
  existing._notePayload = safeNote;
  existing.setTitle(safeNote.title);
  if (!existing.webContents.isDestroyed()) existing.webContents.send('note:payload-updated', safeNote);
  setNoteClickThrough(existing, safeNote.pinned);
  return true;
}

function closeNoteWindow(note) {
  const safeNote = normalizeNotePayload(note);
  const window = noteWindows.get(noteWindowKey(safeNote));
  if (!window || window.isDestroyed()) return false;
  window.close();
  return true;
}

function closeAllNoteWindows() {
  for (const window of [...noteWindows.values()]) {
    if (!window.isDestroyed()) window.close();
  }
  noteWindows.clear();
}

function createNoteWindow(note) {
  const safeNote = normalizeNotePayload(note);
  const key = noteWindowKey(safeNote);
  const existing = noteWindows.get(key);
  if (existing && !existing.isDestroyed()) {
    syncNoteWindow(safeNote);
    existing.show();
    if (!existing._clickThrough) existing.focus();
    return safeNote.id;
  }
  const window = new BrowserWindow({
    width: 340,
    height: 260,
    minWidth: 240,
    minHeight: 160,
    frame: false,
    transparent: true,
    hasShadow: false,
    alwaysOnTop: true,
    opacity: Number(store.load().settings.noteOpacity) || 0.94,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    title: safeNote.title,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !app.isPackaged,
      spellcheck: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });
  secureWindow(window);
  window._noteId = safeNote.id;
  window._noteKey = key;
  window._notePayload = safeNote;
  window._clickThrough = false;
  noteWindows.set(key, window);
  window.on('closed', () => noteWindows.delete(key));
  window.webContents.once('did-finish-load', () => setNoteClickThrough(window, safeNote.pinned));
  handleRendererLoad(window, loadRenderer(window, `?note=${encodeURIComponent(safeNote.id)}`));
  return safeNote.id;
}

function setNoteClickThrough(window, value) {
  if (!window || window.isDestroyed() || noteWindows.get(window._noteKey) !== window) return false;
  const locked = Boolean(value);
  window._clickThrough = locked;
  window.setAlwaysOnTop(true, locked ? 'screen-saver' : 'floating');
  window.setIgnoreMouseEvents(locked, locked ? { forward: true } : undefined);
  window.setFocusable(!locked);
  window.show();
  if (locked) window.moveTop();
  else window.focus();
  if (!window.webContents.isDestroyed()) window.webContents.send('note:click-through', locked);
  return locked;
}

function setNotePinned(window, value) {
  const pinned = setNoteClickThrough(window, value);
  window._notePayload = { ...window._notePayload, pinned };
  if (!window.webContents.isDestroyed()) window.webContents.send('note:payload-updated', window._notePayload);
  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
    mainWindow.webContents.send('note:pinned-changed', {
      serverId: window._notePayload.serverId,
      id: window._notePayload.id,
      pinned,
    });
  }
  return pinned;
}

function setNoteControlsInteractive(window, value) {
  if (!window || window.isDestroyed() || noteWindows.get(window._noteKey) !== window) return false;
  if (!window._clickThrough) return false;
  const interactive = Boolean(value);
  window.setIgnoreMouseEvents(!interactive, interactive ? undefined : { forward: true });
  window.setFocusable(interactive);
  return interactive;
}

function senderWindow(event) {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window || window.isDestroyed()) throw new Error('Недопустимый источник IPC.');
  if (event.senderFrame && event.senderFrame !== event.sender.mainFrame) {
    throw new Error('IPC из вложенного фрейма запрещён.');
  }
  return window;
}

function mainSender(event) {
  const window = senderWindow(event);
  if (window !== mainWindow) throw new Error('Операция доступна только главному окну.');
  return window;
}

function noteSender(event) {
  const window = senderWindow(event);
  if (!window._noteKey || noteWindows.get(window._noteKey) !== window) {
    throw new Error('Операция доступна только окну заметки.');
  }
  return window;
}

function programApiBase() {
  return readConfiguredApiBase({ isPackaged: app.isPackaged, resourcesPath: process.resourcesPath, appPath: app.getAppPath() });
}

function encryptionKeyFile() { return path.join(app.getPath('userData'), 'master-key.bin'); }
function loadOrCreateEncryptionKey() {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Защищённое хранилище Windows недоступно.');
  const file = encryptionKeyFile();
  try {
    if (fs.existsSync(file)) {
      const key = Buffer.from(safeStorage.decryptString(fs.readFileSync(file)), 'base64');
      if (key.length === 32) return key;
    }
  } catch {}
  const key = crypto.randomBytes(32);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, safeStorage.encryptString(key.toString('base64')), { mode: 0o600 });
  fs.renameSync(temporary, file);
  return key;
}

function authTokenFile() { return path.join(app.getPath('userData'), 'program-session.bin'); }
function sanitizeProgramUser(user) {
  if (!user || typeof user !== 'object') return null;
  return {
    id: String(user.id || '').slice(0, 100),
    name: String(user.name || '').slice(0, 120),
    email: String(user.email || '').slice(0, 255),
    plan: String(user.plan || 'GOVHelper Standard').slice(0, 120),
    plan_slug: String(user.plan_slug || 'standard').slice(0, 50),
    entitlements: {
      plus: Boolean(user.entitlements?.plus),
      ai: Boolean(user.entitlements?.ai),
      themes: Boolean(user.entitlements?.themes),
    },
  };
}
function loadProgramToken() {
  try {
    if (!dataEncryptionKey || !fs.existsSync(authTokenFile())) return null;
    const bytes = fs.readFileSync(authTokenFile());
    try {
      const session = decryptData(bytes, dataEncryptionKey);
      programUser = sanitizeProgramUser(session?.user);
      return String(session?.token || '') || null;
    }
    catch {
      if (!safeStorage.isEncryptionAvailable()) return null;
      const legacy = safeStorage.decryptString(bytes);
      if (legacy) saveProgramToken(legacy);
      return legacy || null;
    }
  } catch { return null; }
}
function saveProgramToken(token, user = programUser) {
  programToken = String(token || '');
  programUser = sanitizeProgramUser(user);
  if (!programToken || !dataEncryptionKey) return;
  const file = authTokenFile();
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, encryptData({ token: programToken, user: programUser }, dataEncryptionKey), { mode: 0o600 });
  fs.renameSync(temporary, file);
}
function clearProgramToken() {
  programToken = null;
  programUser = null;
  try { fs.rmSync(authTokenFile(), { force: true }); } catch {}
}
async function programApi(endpoint, options = {}) {
  return requestProgramApi({
    baseUrl: programApiBase(),
    endpoint,
    token: options.auth === false ? null : programToken,
    method: options.method,
    body: options.body,
  });
}

function isPrivateAddress(address) {
  const value = String(address || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (value.startsWith('::ffff:')) return isPrivateAddress(value.slice(7));
  if (net.isIPv4(value)) {
    const parts = value.split('.').map(Number);
    return parts[0] === 10
      || parts[0] === 127
      || parts[0] === 0
      || (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127)
      || (parts[0] === 169 && parts[1] === 254)
      || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
      || (parts[0] === 192 && parts[1] === 168)
      || (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19))
      || parts[0] >= 224;
  }
  if (net.isIPv6(value)) {
    return value === '::1' || value === '::' || value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe8') || value.startsWith('fe9') || value.startsWith('fea') || value.startsWith('feb');
  }
  return false;
}

async function publicHttpsUrl(input) {
  let url;
  try { url = new URL(input); } catch { throw new Error('Некорректный адрес обновления.'); }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('Адрес обновления должен быть публичным HTTPS-адресом без учётных данных.');
  }
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new Error('Локальные адреса обновления запрещены.');
  }
  const addresses = net.isIP(hostname)
    ? [{ address: hostname }]
    : await dns.lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error('Адрес обновления ведёт в локальную или служебную сеть.');
  }
  return url;
}

async function secureFetch(input, options = {}) {
  let url = await publicHttpsUrl(input);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await fetch(url, { ...options, redirect: 'manual' });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get('location');
    if (!location) throw new Error('Сервер обновлений вернул пустое перенаправление.');
    url = await publicHttpsUrl(new URL(location, url));
  }
  throw new Error('Слишком много перенаправлений при обновлении.');
}

async function readTextLimited(response, maxBytes) {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw new Error('Файл обновления слишком большой.');
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error('Файл обновления превышает допустимый размер.');
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total).toString('utf8');
}

function registerIpc() {
  ipcMain.handle('auth:status', async (event) => {
    mainSender(event);
    if (!programToken) programToken = loadProgramToken();
    if (!programToken) {
      closeAllNoteWindows();
      return { authenticated: false };
    }
    try {
      const data = await programApi('/me');
      programUser = sanitizeProgramUser(data.user);
      saveProgramToken(programToken, programUser);
      return { authenticated: true, user: programUser };
    }
    catch (error) {
      if (error.status === 401 || error.status === 403) {
        clearProgramToken();
        closeAllNoteWindows();
        return { authenticated: false, error: error.message };
      }
      if (programUser) return { authenticated: true, offline: true, user: programUser, warning: error.message };
      return { authenticated: false, error: error.message };
    }
  });
  ipcMain.handle('auth:login', async (event, credentials) => {
    mainSender(event);
    const email = String(credentials?.email || '').trim().slice(0, 255);
    const password = String(credentials?.password || '').slice(0, 1000);
    const data = await programApi('/login', { method: 'POST', auth: false, body: { email, password, device_name: `${os.hostname()} · Windows` } });
    saveProgramToken(data.token, data.user);
    return { authenticated: true, user: programUser };
  });
  ipcMain.handle('auth:register', async (event, credentials) => {
    mainSender(event);
    const body = {
      name: String(credentials?.name || '').trim().slice(0, 100),
      email: String(credentials?.email || '').trim().slice(0, 255),
      password: String(credentials?.password || '').slice(0, 1000),
      password_confirmation: String(credentials?.password_confirmation || '').slice(0, 1000),
      terms: Boolean(credentials?.terms),
      device_name: `${os.hostname()} · Windows`,
    };
    const data = await programApi('/register', { method: 'POST', auth: false, body });
    if (!data.token) throw new Error(data.message || 'Подтвердите email на сайте, затем войдите в программу.');
    saveProgramToken(data.token, data.user);
    return { authenticated: true, user: programUser };
  });
  ipcMain.handle('auth:logout', async (event) => {
    mainSender(event);
    try { if (programToken) await programApi('/logout', { method: 'POST' }); }
    catch {}
    finally {
      clearProgramToken();
      closeAllNoteWindows();
    }
    return { authenticated: false };
  });
  ipcMain.handle('auth:open-website', async (event, route) => {
    mainSender(event);
    const allowed = new Set(['/login', '/register', '/forgot-password']);
    const safeRoute = allowed.has(route) ? route : '/login';
    const website = new URL(programApiBase());
    website.pathname = website.pathname.replace(/\/api\/v1\/program\/?$/, '') || '/';
    website.search = '';
    website.hash = '';
    await shell.openExternal(new URL(safeRoute.replace(/^\//, ''), `${website.href.replace(/\/?$/, '/')}`).href);
    return true;
  });
  ipcMain.handle('app:bootstrap', (event) => {
    mainSender(event);
    return ({
    servers: SERVERS.map((server) => ({
      ...server,
      available: fs.existsSync(databaseFile(server)),
    })),
    state: store.load(),
    legacyAvailable: fs.existsSync(LEGACY_DIR),
    appVersion: app.getVersion(),
    });
  });

  ipcMain.handle('data:load-server', (event, serverId) => {
    mainSender(event);
    const server = SERVERS.find((candidate) => candidate.id === serverId);
    if (!server) throw new Error('Неизвестный сервер.');
    return loadDatabase(server);
  });

  ipcMain.handle('state:save', (event, state) => { mainSender(event); return store.save(state); });
  ipcMain.on('state:save-sync', (event, state) => {
    try {
      mainSender(event);
      store.save(state);
      event.returnValue = true;
    } catch {
      event.returnValue = false;
    }
  });
  ipcMain.handle('state:import-legacy', (event) => { mainSender(event); return store.importLegacy(LEGACY_DIR); });
  ipcMain.handle('note:open', (event, note) => { mainSender(event); return createNoteWindow(note); });
  ipcMain.handle('note:sync', (event, note) => { mainSender(event); return syncNoteWindow(note); });
  ipcMain.handle('note:close', (event, note) => { mainSender(event); return closeNoteWindow(note); });
  ipcMain.handle('note:payload', (event) => noteSender(event)._notePayload);
  ipcMain.handle('note:set-pinned', (event, value) => setNotePinned(noteSender(event), value));
  ipcMain.handle('note:set-click-through', (event, value) => {
    const window = noteSender(event);
    return setNotePinned(window, value);
  });
  ipcMain.handle('note:set-controls-interactive', (event, value) => {
    const window = noteSender(event);
    return setNoteControlsInteractive(window, value);
  });
  ipcMain.handle('shortcut:set-toggle', (event, accelerator) => { mainSender(event); return registerToggleShortcut(accelerator); });
  ipcMain.handle('window:close', (event) => senderWindow(event).close());
  ipcMain.handle('window:minimize', (event) => senderWindow(event).minimize());
  ipcMain.handle('window:toggle-maximize', (event) => {
    const window = mainSender(event);
    window.isMaximized() ? window.unmaximize() : window.maximize();
  });
  ipcMain.handle('window:click-through', (event, value) => setMainClickThrough(mainSender(event), value));
  ipcMain.handle('window:always-on-top', (event, value) => setMainAlwaysOnTop(mainSender(event), value));
  ipcMain.handle('window:compact', (event, value) => setMainCompact(mainSender(event), value));
  ipcMain.handle('window:opacity', (event, value) => {
    const safe = Math.min(1, Math.max(0.45, Number(value) || 1));
    mainSender(event).setOpacity(safe);
  });
  ipcMain.handle('window:note-opacity', (event, value) => {
    mainSender(event);
    const safe = Math.min(1, Math.max(0.35, Number(value) || 0.94));
    for (const window of noteWindows.values()) {
      if (!window.isDestroyed()) window.setOpacity(safe);
    }
    return safe;
  });

  ipcMain.handle('data:update', async (event) => {
    mainSender(event);
    const state = store.load();
    const manifestUrl = String(state.settings.databaseManifestUrl || '');
    const response = await secureFetch(manifestUrl, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Сервер обновлений ответил ${response.status}.`);
    const manifest = JSON.parse(await readTextLimited(response, 1024 * 1024));
    const base = new URL('./file/', response.url || manifestUrl);
    const versions = manifest.servers && typeof manifest.servers === 'object'
      ? Object.fromEntries(Object.values(manifest.servers)
        .filter((entry) => entry && typeof entry === 'object' && typeof entry.file === 'string')
        .map((entry) => [entry.file, entry]))
      : manifest.files || manifest;
    if (!versions || typeof versions !== 'object' || Array.isArray(versions)) {
      throw new Error('Манифест обновлений имеет неверный формат.');
    }
    let updated = 0;
    for (const server of SERVERS) {
      if (!Object.hasOwn(versions, server.file)) continue;
      const metadata = versions[server.file];
      if (metadata && typeof metadata === 'object') {
        const expectedSize = Number(metadata.size);
        if (Number.isFinite(expectedSize) && (expectedSize < 2 || expectedSize > 32 * 1024 * 1024)) {
          throw new Error(`Недопустимый размер обновления ${server.name}.`);
        }
      }
      const download = await secureFetch(new URL(server.file, base), { signal: AbortSignal.timeout(30000) });
      if (!download.ok) continue;
      const text = await readTextLimited(download, 32 * 1024 * 1024);
      const bytes = Buffer.from(text, 'utf8');
      if (metadata && typeof metadata === 'object') {
        const expectedSize = Number(metadata.size);
        if (Number.isFinite(expectedSize) && bytes.length !== expectedSize) {
          throw new Error(`Размер обновления ${server.name} не совпадает с манифестом.`);
        }
        const expectedHash = String(metadata.sha256 || metadata.etag || '').toLowerCase();
        if (/^[a-f0-9]{64}$/.test(expectedHash)) {
          const actualHash = crypto.createHash('sha256').update(bytes).digest('hex');
          if (actualHash !== expectedHash) throw new Error(`Контрольная сумма ${server.name} не совпадает.`);
        } else if (expectedHash) {
          throw new Error(`Обновление ${server.name} не содержит безопасную SHA-256 сумму.`);
        }
      }
      const parsed = JSON.parse(text);
      flattenDatabase(parsed, server);
      writeJsonAtomic(path.join(app.getPath('userData'), 'databases', server.file), parsed);
      databaseCache.delete(server.id);
      updated += 1;
    }
    return { updated, checked: SERVERS.length };
  });
}

if (hasSingleInstanceLock) app.whenReady().then(() => {
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  if (typeof session.defaultSession.setDevicePermissionHandler === 'function') {
    session.defaultSession.setDevicePermissionHandler(() => false);
  }
  app.setAppUserModelId('cloud.veyron.goshelper');
  dataEncryptionKey = loadOrCreateEncryptionKey();
  store = new UserStore(app.getPath('userData'), dataEncryptionKey);
  registerIpc();
  createMainWindow();
  registerToggleShortcut(store.load().settings.toggleShortcut);
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createMainWindow(); });
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
