const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pantryDesktopLanguage', {
  initial: ipcRenderer.sendSync('pantry:language:read'),
  save: language => ipcRenderer.sendSync('pantry:language:save', language),
});
