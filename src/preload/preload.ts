import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('pantryAPI', {
  // Methods
  getVersionInfo: () => ipcRenderer.send('get-version-info'),
  getAllApps: () => ipcRenderer.send('get-all-apps'),
  getInstalledApps: () => ipcRenderer.send('get-installed-apps'),
  installApp: (appName: string, appType: string) => ipcRenderer.send('install-app', appName, appType),
  uninstallApp: (appName: string, appType: string) => ipcRenderer.send('uninstall-app', appName, appType),
  executeCommand: (command: string) => ipcRenderer.send('execute-command', command),
  getTerminalPrompt: () => ipcRenderer.send('get-terminal-prompt'),
  getLogPath: () => ipcRenderer.send('get-log-path'),

  // Listeners
  onToggleTerminal: (callback: () => void) => ipcRenderer.on('toggle-terminal', callback),
  onTerminalOutput: (callback: (data: string) => void) => 
    ipcRenderer.on('terminal-output', (_event, data) => callback(data)),
  onAllApps: (callback: (apps: any[]) => void) => 
    ipcRenderer.on('all-apps', (_event, apps) => callback(apps)),
  onInstalledApps: (callback: (apps: any[]) => void) => 
    ipcRenderer.on('installed-apps', (_event, apps) => callback(apps)),
  onInstallComplete: (callback: (data: { appName: string; success: boolean }) => void) => 
    ipcRenderer.on('install-complete', (_event, data) => callback(data)),
  onUninstallComplete: (callback: (data: { appName: string; success: boolean }) => void) => 
    ipcRenderer.on('uninstall-complete', (_event, data) => callback(data)),
  onLoadingStatus: (callback: (data: { loading: boolean; message?: string }) => void) => 
    ipcRenderer.on('loading-status', (_event, data) => callback(data)),
  onAllAppsUpdated: (callback: (apps: any[]) => void) => 
    ipcRenderer.on('all-apps-updated', (_event, apps) => callback(apps)),
  onTerminalPromptInfo: (callback: (data: { username: string; hostname: string; dir: string }) => void) => 
    ipcRenderer.on('terminal-prompt-info', (_event, data) => callback(data)),
  onLogPath: (callback: (logFilePath: string) => void) => 
    ipcRenderer.on('log-path', (_event, logFilePath) => callback(logFilePath)),
  onVersionInfo: (callback: (versionData: { version: string; commit?: string }) => void) => 
    ipcRenderer.on('version-info', (_event, versionData) => callback(versionData)),

  // Sudo password handling
  onSudoPasswordRequest: (callback: (data: { requestId: string; appName: string }) => void) =>
    ipcRenderer.on('sudo-password-request', (_event, data) => callback(data)),
  sendSudoPassword: (requestId: string, password: string) =>
    ipcRenderer.send('sudo-password-response', requestId, password),
});
