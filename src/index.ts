import dns from 'dns';
import net from 'net';

dns.setDefaultResultOrder('ipv4first');
net.setDefaultAutoSelectFamily?.(false);

import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import Launcher from './Launcher/Launcher';
import Server from './Server/Server';
import settings, { maxAllowedRam, MIN_RAM } from './Settings/Settings';
import { getDataDir } from './utils';
import fs from 'fs';

const path = require('path');
const launcher = new Launcher();
const server = new Server();

let splashWin: BrowserWindow | null = null;
let mainWin: BrowserWindow | null = null;
let mainOpened = false;

const webviewPath = (file: string) =>
  path.join(app.getAppPath(), 'src', 'webview', file);

// ---------- Fenêtre de chargement ----------
const createSplash = () => {
  splashWin = new BrowserWindow({
    width: 420,
    height: 520,
    resizable: false,
    frame: false,
    center: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  splashWin.loadFile(webviewPath('loader/load.html'));
  splashWin.on('closed', () => { splashWin = null; });

  splashWin.webContents.once('did-finish-load', checkForUpdates);
}

// ---------- Fenêtre principale ----------
const openMainWindow = () => {
  if (mainOpened) return;
  mainOpened = true;

  mainWin = new BrowserWindow({
    width: 1280,
    height: 720,
    resizable: false,
    show: false,
    fullscreenable: false,
    maximizable: false,
    backgroundColor: "#ffae00",
    frame: false,
    icon: path.join(__dirname, 'assets/logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWin.loadFile(webviewPath('index.html'));

  mainWin.once('ready-to-show', () => {
    mainWin?.show();
    splashWin?.close();
  });
}


let launchWin: BrowserWindow | null = null;
let launching = false;

const createLaunchWindow = (): Promise<void> => new Promise((resolve) => {
  launchWin = new BrowserWindow({
    width: 420,
    height: 520,
    resizable: false,
    frame: false,
    center: true,
    fullscreenable: false,
    maximizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  launchWin.on('closed', () => { launchWin = null; });
  launchWin.webContents.once('did-finish-load', () => resolve());
  launchWin.loadFile(webviewPath('loader/launch.html'));
});

const backToLauncher = () => {
  launchWin?.close();
  mainWin?.show();
  launching = false;
};

// ---------- Auto update ----------
const sendUpdateStatus = (status: string, data?: unknown) => {
  splashWin?.webContents.send('update-status', { status, data });
}

function checkForUpdates() {
  if (!app.isPackaged) {
    sendUpdateStatus('none');
    setTimeout(openMainWindow, 2000);
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  const timeout = setTimeout(openMainWindow, 10000);

  autoUpdater.on('checking-for-update', () => sendUpdateStatus('checking'));

  autoUpdater.on('update-available', (info) => {
    clearTimeout(timeout);
    sendUpdateStatus('available', info.version);
  });

  autoUpdater.on('update-not-available', () => {
    clearTimeout(timeout);
    sendUpdateStatus('none');
    setTimeout(openMainWindow, 800);
  });

  autoUpdater.on('download-progress', (p) => {
    sendUpdateStatus('progress', p.percent);
  });

  autoUpdater.on('update-downloaded', () => {
    sendUpdateStatus('downloaded');
    if (!mainOpened) {
      setTimeout(() => autoUpdater.quitAndInstall(true, true), 1200);
    }
  });

  autoUpdater.on('error', (err) => {
    clearTimeout(timeout);
    console.log('Erreur updater :', err.message);
    sendUpdateStatus('error');
    setTimeout(openMainWindow, 1000);
  });

  autoUpdater.checkForUpdates().catch((err) => {
    console.log('Vérification impossible :', err.message);
  });
}
// ---------------------------------

ipcMain.handle('connect', async () => {
  await launcher.connect();
  return true;
})

ipcMain.handle('launch', async () => {
  if (launching) return false;   // évite les doubles clics
  launching = true;

  try {
    await launcher.connect();
    mainWin?.hide();
    await createLaunchWindow();

    await launcher.launch((status, data) => {
      launchWin?.webContents.send('launch-status', { status, data });

      if (status === 'started') {
        setTimeout(() => {
          launchWin?.close();
          if (settings.get().closeOnLaunch) app.quit();
        }, 1500);
      } else if (status === 'closed') {
        backToLauncher();
      } else if (status === 'error') {
        setTimeout(backToLauncher, 3000);
      }
    });

    return true;
  } catch (err) {
    console.error(err);
    backToLauncher();
    return false;
  }
});

ipcMain.handle('getHeadSkin', async () => {
  return await launcher.getHeadSkin();
})

ipcMain.handle('getInstance', () => launcher.getInstance());

ipcMain.handle('getServerStatus', async (_event, srv: string) => {
  return await server.getServerStatus(srv);
});

ipcMain.handle('window:minimize', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});

ipcMain.handle('window:close', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

ipcMain.handle('settings:get', () => ({
  settings: settings.get(),
  limits: { min: MIN_RAM, max: maxAllowedRam() },
  info: { version: app.getVersion(), dataDir: getDataDir() }
}));

ipcMain.handle('settings:set', (_event, partial) => settings.set(partial));

ipcMain.handle('settings:reset', () => settings.reset());

ipcMain.handle('settings:openFolder', async () => {
  await shell.openPath(getDataDir());
  return true;
});

ipcMain.handle('account:logout', async () => {
  if (launching) return false;
  await launcher.logout();
  return true;
});

ipcMain.handle('mods:get', () => {
  try {
    const raw = fs.readFileSync(webviewPath('mods/mods.json'), 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data.mods) ? data.mods : [];
  } catch (err) {
    console.error('Lecture de mods.json impossible :', err);
    return [];
  }
});

app.whenReady().then(async () => {
  createSplash();
  let status = await launcher.checkAccount();
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})