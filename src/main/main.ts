import { app, BrowserWindow, shell } from 'electron';
import * as path from 'path';
import { setupIpcHandlers } from './ipcHandlers';
import { logCommand } from '../utils/logger';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Pantry',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js'),
    },
  });

  // Load HTML file from dist directory
  const htmlPath = path.join(__dirname, '../renderer/index.html');
  console.log('[Main] Loading HTML from:', htmlPath);

  // Open DevTools only in development
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  // Forward console messages
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console ${level}] ${message} (line: ${line})`);
  });

  mainWindow.loadFile(htmlPath);

  // Open all external links in the default OS browser
  // Handles <a target="_blank"> clicks
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' }; // never open a new Electron window
  });

  // Handles direct navigation attempts away from the app
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const appUrl = mainWindow?.webContents.getURL() ?? '';
    if (url !== appUrl) {
      event.preventDefault();
      if (url.startsWith('http://') || url.startsWith('https://')) {
        shell.openExternal(url);
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Register Cmd-J shortcut - setup immediately and also after load
  const setupCmdJ = () => {
    mainWindow?.webContents.on('before-input-event', (event, input) => {
      if (
        input.key === 'j' &&
        (input.meta || input.control) &&
        input.type === 'keyDown'
      ) {
        event.preventDefault();
        console.log('[Main] Cmd+J pressed, toggling terminal');
        mainWindow?.webContents.send('toggle-terminal');
      }
    });
  };

  // Setup immediately
  setupCmdJ();

  // Also setup after window loads (backup)
  mainWindow.webContents.once('did-finish-load', () => {
    console.log('[Main] Window loaded, Cmd+J shortcut should be active');
  });
}

function initializeApp(): void {
  // Set app name
  app.setName('Pantry');

  // Log app startup
  logCommand('Pantry started', undefined, undefined);
  console.log('[Main] Pantry starting...');

  // Setup IPC handlers BEFORE creating window
  console.log('[Main] Setting up IPC handlers...');
  setupIpcHandlers();
  console.log('[Main] IPC handlers set up');

  // Create window when ready
  app.whenReady().then(() => {
    console.log('[Main] App ready, creating window...');
    createWindow();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (mainWindow === null) {
      createWindow();
    }
  });
}

// Initialize the app
initializeApp();
