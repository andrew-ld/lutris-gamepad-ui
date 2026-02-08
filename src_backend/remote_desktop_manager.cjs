const { getSessionBus } = require("./dbus_manager.cjs");
const {
  getRemoteDesktopSessionHandle,
  setRemoteDesktopSessionHandle,
} = require("./state.cjs");
const {
  logInfo,
  logError,
  logWarn,
  debounce,
  toastError,
} = require("./utils.cjs");
const { getKvStoreValue, setKvStoreValue } = require("./storage_kv.cjs");

const PORTAL_DESTINATION = "org.freedesktop.portal.Desktop";
const PORTAL_PATH = "/org/freedesktop/portal/desktop";
const REMOTE_DESKTOP_IFACE = "org.freedesktop.portal.RemoteDesktop";
const REQUEST_IFACE = "org.freedesktop.portal.Request";
const SESSION_IFACE = "org.freedesktop.portal.Session";

const KEYSYMS = { Alt_L: 0xffe9, Tab: 0xff09 };
const DEVICE_TYPE = { KEYBOARD: 1, POINTER: 2 };
const KEY_STATE = { RELEASE: 0, PRESS: 1 };
const PERSIST_MODE = { UNTIL_REVOKED: 2 };
const ALT_TAB_TIMEOUT_MS = 1000;

const KV_STORAGE_TOKEN_KEY = "remote_desktop_manager.token";

function getRemoteDesktopRestoreToken() {
  const token = getKvStoreValue(KV_STORAGE_TOKEN_KEY);
  logInfo("Retrieved remote desktop restore token from storage:", token);
  return token;
}

function setRemoteDesktopRestoreToken(token) {
  logInfo("Saving remote desktop restore token to storage:", token);
  setKvStoreValue(KV_STORAGE_TOKEN_KEY, token);
}

function _getBus() {
  return getSessionBus("remote_desktop_manager", false);
}

function invoke(bus, parameters) {
  return new Promise((resolve, reject) => {
    bus.invoke(parameters, (err, result) => {
      if (err) {
        logError("DBus invocation failed for member:", parameters.member, err);
        return reject(
          new Error(`${parameters.member} call failed: ${JSON.stringify(err)}`),
        );
      }
      resolve(result);
    });
  });
}

function getVariantValue(resultsArray, key) {
  const pair = resultsArray.find(([k]) => k === key);
  return pair?.[1]?.[1]?.[0];
}

async function _portalRequest(bus, parameters) {
  logInfo("Initiating portal request for:", parameters.member);
  const requestHandle = await invoke(bus, parameters);
  logInfo(
    "Portal request returned handle:",
    requestHandle,
    "for member:",
    parameters.member,
  );

  const signalMatchRule = `type='signal',interface='${REQUEST_IFACE}',path='${requestHandle}'`;

  return new Promise((resolve, reject) => {
    const onResponse = (msg) => {
      if (msg.path === requestHandle && msg.member === "Response") {
        bus.connection.removeListener("message", onResponse);
        bus.removeMatch(signalMatchRule, () => {});

        const [responseCode, results] = msg.body;
        logInfo(
          "Received portal response signal for:",
          parameters.member,
          "Code:",
          responseCode,
        );

        if (responseCode !== 0) {
          logError(
            "Portal request failed with non-zero response code:",
            responseCode,
            "for member:",
            parameters.member,
          );
          return reject(
            new Error(
              `${parameters.member} request failed with code ${responseCode}.`,
            ),
          );
        }
        resolve(results);
      }
    };

    bus.addMatch(signalMatchRule, (err) => {
      if (err) {
        return reject(
          new Error(`Failed to add signal match for ${requestHandle}: ${err}`),
        );
      }
      bus.connection.on("message", onResponse);
    });
  });
}

async function _sendKey(keysym, state) {
  const sessionHandle = getRemoteDesktopSessionHandle();
  if (!sessionHandle) {
    throw new Error("Cannot send key: No active remote desktop session.");
  }

  const bus = await _getBus();

  await invoke(bus, {
    destination: PORTAL_DESTINATION,
    path: PORTAL_PATH,
    interface: REMOTE_DESKTOP_IFACE,
    member: "NotifyKeyboardKeysym",
    signature: "oa{sv}iu",
    body: [sessionHandle, [], keysym, state],
  });
}

async function _pressKey(keysym) {
  return _sendKey(keysym, KEY_STATE.PRESS);
}

async function _releaseKey(keysym) {
  return _sendKey(keysym, KEY_STATE.RELEASE);
}

async function _startRemoteDesktopSession(restoreToken) {
  logInfo(
    "Starting remote desktop session sequence. Existing restore token:",
    restoreToken,
  );

  try {
    const bus = await _getBus();

    logInfo("Requesting new session creation from portal");
    const createResults = await _portalRequest(bus, {
      destination: PORTAL_DESTINATION,
      path: PORTAL_PATH,
      interface: REMOTE_DESKTOP_IFACE,
      member: "CreateSession",
      signature: "a{sv}",
      body: [[["session_handle_token", ["s", "lutris_gamepad_ui"]]]],
    });

    const sessionHandle = getVariantValue(createResults, "session_handle");
    if (!sessionHandle) {
      throw new Error("Portal did not return a session_handle.");
    }
    logInfo("Successfully acquired session handle:", sessionHandle);

    const selectDeviceOptions = [
      ["types", ["u", DEVICE_TYPE.KEYBOARD | DEVICE_TYPE.POINTER]],
      ["persist_mode", ["u", PERSIST_MODE.UNTIL_REVOKED]],
    ];

    if (restoreToken) {
      logInfo(
        "Appending existing restore token to device selection options:",
        restoreToken,
      );
      selectDeviceOptions.push(["restore_token", ["s", restoreToken]]);
    } else {
      logInfo(
        "No restore token provided; proceeding with fresh device selection.",
      );
    }

    logInfo(
      "Invoking SelectDevices with payload:",
      JSON.stringify(selectDeviceOptions),
    );

    await invoke(bus, {
      destination: PORTAL_DESTINATION,
      path: PORTAL_PATH,
      interface: REMOTE_DESKTOP_IFACE,
      member: "SelectDevices",
      signature: "oa{sv}",
      body: [sessionHandle, selectDeviceOptions],
    });

    logInfo("SelectDevices invoked successfully. Requesting session start");

    const startResults = await _portalRequest(bus, {
      destination: PORTAL_DESTINATION,
      path: PORTAL_PATH,
      interface: REMOTE_DESKTOP_IFACE,
      member: "Start",
      signature: "osa{sv}",
      body: [sessionHandle, "", []],
    });

    logInfo(
      "Session start request completed. Analyzing results",
      JSON.stringify(startResults),
    );

    const newRestoreToken = getVariantValue(startResults, "restore_token");
    logInfo("Portal returned restore token after start:", newRestoreToken);

    if (newRestoreToken) {
      if (newRestoreToken !== restoreToken) {
        logInfo(
          "New restore token received differs from the old one. Updating storage.",
        );
        setRemoteDesktopRestoreToken(newRestoreToken);
      } else {
        logInfo("Restore token remains unchanged.");
      }
    } else {
      logWarn(
        "Portal did not return a restore token despite persist mode request.",
      );
    }

    setRemoteDesktopSessionHandle(sessionHandle);

    logInfo("Remote desktop session started successfully.");
  } catch (error) {
    logError(
      "Fatal error occurred during remote desktop session startup:",
      error,
    );
    toastError("Remote Desktop Manager", error);
    await stopRemoteDesktopSession();
    throw error;
  }
}

async function startRemoteDesktopSession() {
  if (getRemoteDesktopSessionHandle()) {
    logWarn("A remote desktop session is already active. Aborting start.");
    return;
  }

  const restoreToken = getRemoteDesktopRestoreToken();

  if (restoreToken) {
    try {
      logInfo("Attempting to restore session with token:", restoreToken);
      return await _startRemoteDesktopSession(restoreToken);
    } catch (e) {
      logError(
        "Failed to restore remote desktop session with existing token:",
        e,
      );
    }
  }

  try {
    logInfo("Starting fresh remote desktop session (no valid token found).");
    return await _startRemoteDesktopSession();
  } catch (e) {
    logError("Failed to start remote desktop session:", e);
  }
}

async function stopRemoteDesktopSession() {
  const sessionHandle = getRemoteDesktopSessionHandle();
  if (!sessionHandle) return;

  logInfo("Closing remote desktop session handle:", sessionHandle);
  try {
    const bus = await _getBus();
    await invoke(bus, {
      destination: PORTAL_DESTINATION,
      path: sessionHandle,
      interface: SESSION_IFACE,
      member: "Close",
    });
    logInfo("Remote desktop session closed successfully.");
  } catch (err) {
    logWarn("Failed to close session handle:", sessionHandle, err);
  } finally {
    setRemoteDesktopSessionHandle(null);
  }
}

const releaseAltDebounced = debounce(() => {
  _releaseKey(KEYSYMS.Alt_L).catch((e) => {
    logError("Unable to release Alt key:", e);
  });
}, ALT_TAB_TIMEOUT_MS);

async function sendAltTab() {
  if (!getRemoteDesktopSessionHandle()) {
    throw new Error("Cannot send Alt+Tab: Session not active.");
  }

  logInfo("Sending alt+tab using remote desktop session");

  await _pressKey(KEYSYMS.Alt_L);
  releaseAltDebounced();
  await _pressKey(KEYSYMS.Tab);
  await _releaseKey(KEYSYMS.Tab);
}

module.exports = {
  startRemoteDesktopSession,
  stopRemoteDesktopSession,
  sendAltTab,
};
