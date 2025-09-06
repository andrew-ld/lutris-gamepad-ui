/** @type {import('electron').BrowserWindow | null} */
let mainWindow = null;
/** @type {import('child_process').ChildProcess | null} */
let runningGameProcess = null;
/** @type {import('paclient') | null} */
let pulseAudioClient = null;
let remoteDesktopSessionHandle = null;

const whitelistedAppProtocolFiles = new Set();

module.exports = {
  getMainWindow: () => mainWindow,
  setMainWindow: (win) => {
    mainWindow = win;
  },
  getRunningGameProcess: () => runningGameProcess,
  setRunningGameProcess: (proc) => {
    runningGameProcess = proc;
  },
  getPulseAudioClient: () => pulseAudioClient,
  setPulseAudioClient: (client) => {
    pulseAudioClient = client;
  },
  getWhitelistedFiles: () => whitelistedAppProtocolFiles,
  addWhitelistedFile: (file) => whitelistedAppProtocolFiles.add(file),
  getRemoteDesktopSessionHandle: () => remoteDesktopSessionHandle,
  setRemoteDesktopSessionHandle: (handle) => {
    remoteDesktopSessionHandle = handle;
  },
};
