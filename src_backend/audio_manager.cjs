const { existsSync } = require("node:fs");
const { readFile } = require("node:fs/promises");
const { homedir } = require("node:os");
const path = require("node:path");

const PAClient = require("@futpib/paclient");

const {
  getMainWindow,
  getPulseAudioClient,
  setPulseAudioClient,
} = require("./state.cjs");
const { logError, logInfo, debounce, toastError } = require("./utils.cjs");

let initializationPromise = null;

const mapSinkInfo = (sink) => ({
  index: sink.index,
  name: sink.name,
  description: sink.description,
  volume: Math.round((sink.channelVolumes[0] / sink.baseVolume) * 100),
  isMuted: sink.muted,
  baseVolume: sink.baseVolume,
});

/** @param {PAClient} pulseAudioClient */
async function getSinkInfoFromPA(pulseAudioClient) {
  const defaultSinkInfo = await new Promise((resolve, reject) => {
    pulseAudioClient.getSink("@DEFAULT_SINK@", (error, r) =>
      error ? reject(error) : resolve(r),
    );
  });

  const allSinkInfo = await new Promise((resolve, reject) => {
    pulseAudioClient.getSinks((error, r) =>
      error ? reject(error) : resolve(r),
    );
  });

  return {
    ...mapSinkInfo(defaultSinkInfo),
    availableSinks: allSinkInfo.map((sink) => mapSinkInfo(sink)),
  };
}

async function sendCurrentAudioInfo(pulseClient) {
  const mainWindow = getMainWindow();
  if (!mainWindow) return;

  const audioInfo = await getSinkInfoFromPA(pulseClient);
  mainWindow.webContents.send("audio-info-changed", audioInfo);
}

async function getPulseCookie() {
  const possiblePaths = [];

  if (process.env.PULSE_COOKIE) {
    possiblePaths.push(process.env.PULSE_COOKIE);
  }

  if (process.env.XDG_RUNTIME_DIR) {
    possiblePaths.push(path.join(process.env.XDG_RUNTIME_DIR, "pulse/cookie"));
  }

  possiblePaths.push(path.join(homedir(), ".config/pulse/cookie"));

  for (const possiblePath of possiblePaths) {
    try {
      if (existsSync(possiblePath)) {
        return await readFile(possiblePath);
      }
    } catch (error) {
      logError("unable to read PulseAudio cookie at", possiblePath, error);
    }
  }

  logError("PulseAudio cookie file does not exist");
}

const sendCurrentAudioInfoDebounced = debounce(sendCurrentAudioInfo, 100);

/** @returns {Promise<PAClient | null>} */
function initializePulseAudioClient() {
  const existingClient = getPulseAudioClient();
  if (existingClient) {
    return Promise.resolve(existingClient);
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    let pulseAudioCookieBuffer;

    try {
      pulseAudioCookieBuffer = await getPulseCookie();
    } catch (error) {
      logError("unable to read PulseAudio cookie", error);
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
    } catch (error) {
      toastError("Audio Manager", error);
      logError("Unable to get PulseAudio client:", error);
      initializationPromise = null;
      return null;
    } finally {
      if (getPulseAudioClient() === pa) {
        initializationPromise = null;
      }
    }
  })();

  return initializationPromise;
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
  pulseClient.setSinkVolumes(sinkInfo.index, [rawVolume], (error) => {
    if (error) logInfo("Cannot set audio volume", error);
  });
}

async function setDefaultSink(sinkName) {
  const pulseClient = await initializePulseAudioClient();
  if (!pulseClient) {
    logError("Cannot set default sink: PulseAudio client not available.");
    return;
  }
  pulseClient.setDefaultSinkByName(sinkName, (error) => {
    if (error) logInfo("Cannot set default sink", error, sinkName);
  });
}

async function setAudioMute(mute) {
  const pulseClient = await initializePulseAudioClient();
  if (!pulseClient) {
    logError("Cannot set audio mute: PulseAudio client not available.");
    return;
  }
  const sinkInfo = await getSinkInfoFromPA(pulseClient);
  pulseClient.setSinkMute(sinkInfo.index, mute, (error) => {
    if (error) logInfo("Cannot set audio mute", error);
  });
}

module.exports = {
  getAudioInfo,
  setAudioVolume,
  setDefaultSink,
  setAudioMute,
};
