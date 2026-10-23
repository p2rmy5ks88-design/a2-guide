// Tells the game it runs as the desktop app, and gives it Quit and full-screen controls.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('SKYLINE_DESKTOP', {
  quit: () => ipcRenderer.send('sk-quit'),
  fullscreen: () => ipcRenderer.send('sk-full')
});
