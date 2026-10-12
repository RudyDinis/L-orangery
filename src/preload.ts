const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron
})

contextBridge.exposeInMainWorld('updater', {
  onStatus: (cb: (payload: { status: string; data?: unknown }) => void) =>
    ipcRenderer.on('update-status', (_e:any, payload:any) => cb(payload)),
  install: () => ipcRenderer.invoke('installUpdate'),
})

contextBridge.exposeInMainWorld('electronAPI', {
  connect: () => ipcRenderer.invoke('connect'),
  launch: () => ipcRenderer.invoke('launch'),
  getHeadSkin: () => ipcRenderer.invoke('getHeadSkin'),
  getServerStatus: (srv: string) => ipcRenderer.invoke('getServerStatus', srv)
});

contextBridge.exposeInMainWorld('windowControls', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close: () => ipcRenderer.invoke('window:close'),
})

contextBridge.exposeInMainWorld('launchEvents', {
  onStatus: (cb: (payload: { status: string; data?: any }) => void) =>
    ipcRenderer.on('launch-status', (_e: any, payload: any) => cb(payload)),
})

contextBridge.exposeInMainWorld('settingsAPI', {
  get: () => ipcRenderer.invoke('settings:get'),
  set: (partial: any) => ipcRenderer.invoke('settings:set', partial),
  reset: () => ipcRenderer.invoke('settings:reset'),
  openFolder: () => ipcRenderer.invoke('settings:openFolder'),
  logout: () => ipcRenderer.invoke('account:logout'),
})

contextBridge.exposeInMainWorld('modsAPI', {
  get: () => ipcRenderer.invoke('mods:get'),
  getInstance: () => ipcRenderer.invoke('getInstance'),
})