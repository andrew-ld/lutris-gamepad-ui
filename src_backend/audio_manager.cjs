const PAClient = require("paclient");
const path = require("node:path");
const { homedir } = require("os");
const { existsSync } = require("fs");
const { readFile } = require("fs/promises");
const {
  getMainWindow,
  getPulseAudioClient,
  setPulseAudioClient,
} = require("./state.cjs");
const { logError, logInfo, debounce } = require("./utils.cjs");

/** @param {PAClient} pulseAudioClient */
async function getSinkInfoFromPA(pulseAudioClient) {
  const defaultSinkInfo = await new Promise((resolve, reject) => {
    pulseAudioClient.getSink("@DEFAULT_SINK@", (e, r) =>
      e ? reject(e) : resolve(r)
    );
  });

  const allSinkInfo = await new Promise((resolve, reject) => {
    pulseAudioClient.getSinks((e, r) => (e ? reject(e) : resolve(r)));
  });

  const mapSinkInfo = (sink) => ({
    index: sink.index,
    name: sink.name,
    description: sink.description,
    volume: Math.round((sink.channelVolumes[0] / sink.baseVolume) * 100),
    isMuted: sink.muted,
    baseVolume: sink.baseVolume,
  });

  return {
    ...mapSinkInfo(defaultSinkInfo),
    availableSinks: allSinkInfo.map(mapSinkInfo),
  };
}

async function sendCurrentAudioInfo(pulseClient) {
  const mainWindow = getMainWindow();
  if (!mainWindow) return;

  const audioInfo = await getSinkInfoFromPA(pulseClient);
  mainWindow.webContents.send("audio-info-changed", audioInfo);
}

const sendCurrentAudioInfoDebounced = debounce(sendCurrentAudioInfo, 100);

/** @returns {Promise<PAClient | null>} */
async function initializePulseAudioClient() {
  if (getPulseAudioClient()) {
    return getPulseAudioClient();
  }

  const pulseAudioCookiePath = path.join(homedir(), ".config/pulse/cookie");
  let pulseAudioCookieBuffer;
  if (existsSync(pulseAudioCookiePath)) {
    pulseAudioCookieBuffer = await readFile(pulseAudioCookiePath);
  } else {
    logError("PulseAudio cookie file does not exist:", pulseAudioCookiePath);
  }

  const pa = new PAClient({ cookie: pulseAudioCookieBuffer });

  pa.on("close", () => {
    if (getPulseAudioClient() === pa) {
      setPulseAudioClient(null);
    }
  });

  try {
    await new Promise((resolve, reject) => {
      pa.once("ready", () => {
        logInfo("Audio manager connected to PulseAudio successfully.");
        resolve();
      });
      pa.once("error", (e) => {
        reject(e);
      });
      pa.connect();
    });

    setPulseAudioClient(pa);

    pa.on("change", () => sendCurrentAudioInfoDebounced(pa));
    pa.on("new", () => sendCurrentAudioInfoDebounced(pa));
    pa.on("remove", () => sendCurrentAudioInfoDebounced(pa));
    pa.subscribe("all");

    return pa;
  } catch (e) {
    logError("Unable to get PulseAudio client:", e);
    return null;
  }
}

async function getAudioInfo() {
  const pulseClient = await initializePulseAudioClient();
  return pulseClient ? await getSinkInfoFromPA(pulseClient) : null;
}

async function setAudioVolume(volumePercent) {
  const pulseClient = await initializePulseAudioClient();
  if (!pulseClient) {
    logError("Cannot set audio volume: PulseAudio client not available.");
    return;
  }
  const sinkInfo = await getSinkInfoFromPA(pulseClient);
  const targetVolume = Math.max(0, Math.min(100, volumePercent));
  const rawVolume = Math.round((targetVolume / 100) * sinkInfo.baseVolume);
  pulseClient.setSinkVolumes(sinkInfo.index, [rawVolume], (err) => {
    if (err) logInfo("Cannot set audio volume", err);
  });
}

async function setDefaultSink(sinkName) {
  const pulseClient = await initializePulseAudioClient();
  if (!pulseClient) {
    logError("Cannot set default sink: PulseAudio client not available.");
    return;
  }
  pulseClient.setDefaultSinkByName(sinkName, (err) => {
    if (err) logInfo("Cannot set default sink", err, sinkName);
  });
}

async function setAudioMute(mute) {
  const pulseClient = await initializePulseAudioClient();
  if (!pulseClient) {
    logError("Cannot set audio mute: PulseAudio client not available.");
    return;
  }
  const sinkInfo = await getSinkInfoFromPA(pulseClient);
  pulseClient.setSinkMute(sinkInfo.index, mute, (err) => {
    if (err) logInfo("Cannot set audio mute", err);
  });
}

module.exports = {
  getAudioInfo,
  setAudioVolume,
  setDefaultSink,
  setAudioMute,
};
