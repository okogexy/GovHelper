const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gosHelper', {
  authStatus: () => ipcRenderer.invoke('auth:status'),
  login: (email, password) => ipcRenderer.invoke('auth:login', { email, password }),
  register: (name, email, password, passwordConfirmation, terms) => ipcRenderer.invoke('auth:register', {
    name, email, password, password_confirmation: passwordConfirmation, terms,
  }),
  logout: () => ipcRenderer.invoke('auth:logout'),
  openAuthWebsite: (route) => ipcRenderer.invoke('auth:open-website', route),
  notePayload: () => ipcRenderer.invoke('note:payload'),
  bootstrap: () => ipcRenderer.invoke('app:bootstrap'),
  loadServer: (serverId) => ipcRenderer.invoke('data:load-server', serverId),
  saveState: (state) => ipcRenderer.invoke('state:save', state),
  saveStateSync: (state) => ipcRenderer.sendSync('state:save-sync', state),
  importLegacy: () => ipcRenderer.invoke('state:import-legacy'),
  updateDatabases: () => ipcRenderer.invoke('data:update'),
  createNoteWindow: (note) => ipcRenderer.invoke('note:open', note),
  syncNoteWindow: (note) => ipcRenderer.invoke('note:sync', note),
  closeNoteWindow: (note) => ipcRenderer.invoke('note:close', note),
  setNotePinned: (value) => ipcRenderer.invoke('note:set-pinned', Boolean(value)),
  setNoteClickThrough: (value) => ipcRenderer.invoke('note:set-click-through', Boolean(value)),
  setNoteControlsInteractive: (value) => ipcRenderer.invoke('note:set-controls-interactive', Boolean(value)),
  setToggleShortcut: (accelerator) => ipcRenderer.invoke('shortcut:set-toggle', String(accelerator || '')),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
  setAlwaysOnTop: (value) => ipcRenderer.invoke('window:always-on-top', Boolean(value)),
  setMainClickThrough: (value) => ipcRenderer.invoke('window:click-through', Boolean(value)),
  setCompactMode: (value) => ipcRenderer.invoke('window:compact', Boolean(value)),
  setOpacity: (value) => ipcRenderer.invoke('window:opacity', Number(value)),
  setNoteOpacity: (value) => ipcRenderer.invoke('window:note-opacity', Number(value)),
  onShortcut: (callback) => {
    const handler = (_event, action) => callback(action);
    ipcRenderer.on('shortcut', handler);
    return () => ipcRenderer.removeListener('shortcut', handler);
  },
  onMainClickThroughChanged: (callback) => {
    const handler = (_event, value) => callback(Boolean(value));
    ipcRenderer.on('window:click-through-changed', handler);
    return () => ipcRenderer.removeListener('window:click-through-changed', handler);
  },
  onNoteClickThrough: (callback) => {
    const handler = (_event, value) => callback(Boolean(value));
    ipcRenderer.on('note:click-through', handler);
    return () => ipcRenderer.removeListener('note:click-through', handler);
  },
  onNotePayloadUpdated: (callback) => {
    const handler = (_event, value) => callback(value);
    ipcRenderer.on('note:payload-updated', handler);
    return () => ipcRenderer.removeListener('note:payload-updated', handler);
  },
  onNotePinnedChanged: (callback) => {
    const handler = (_event, value) => callback(value);
    ipcRenderer.on('note:pinned-changed', handler);
    return () => ipcRenderer.removeListener('note:pinned-changed', handler);
  },
});
