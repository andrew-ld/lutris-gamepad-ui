const { getSessionBus } = require("./dbus_manager.cjs");
const {
  getRemoteDesktopSessionHandle,
  setRemoteDesktopSessionHandle,
} = require("./state.cjs");
const { logInfo, logError, logWarn } = require("./utils.cjs");

const PORTAL_DESTINATION = "org.freedesktop.portal.Desktop";
const PORTAL_PATH = "/org/freedesktop/portal/desktop";
const REMOTE_DESKTOP_IFACE = "org.freedesktop.portal.RemoteDesktop";
const REQUEST_IFACE = "org.freedesktop.portal.Request";
const SESSION_IFACE = "org.freedesktop.portal.Session";

const KEYSYMS = { Alt_L: 0xffe9, Tab: 0xff09 };
const DEVICE_TYPE = { KEYBOARD: 1, POINTER: 2 };
const KEY_STATE = { RELEASE: 0, PRESS: 1 };

function _getBus() {
  return getSessionBus("remote_desktop_manager", false);
}

function invoke(bus, parameters) {
  return new Promise((resolve, reject) => {
    bus.invoke(parameters, (err, result) => {
      if (err) {
        return reject(
          new Error(`${parameters.member} call failed: ${JSON.stringify(err)}`)
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
  const requestHandle = await invoke(bus, parameters);
  const signalMatchRule = `type='signal',interface='${REQUEST_IFACE}',path='${requestHandle}'`;

  return new Promise((resolve, reject) => {
    const onResponse = (msg) => {
      if (msg.path === requestHandle && msg.member === "Response") {
        bus.connection.removeListener("message", onResponse);
        bus.removeMatch(signalMatchRule, () => {});

        const [responseCode, results] = msg.body;
        if (responseCode !== 0) {
          return reject(
            new Error(
              `${parameters.member} request failed with code ${responseCode}.`
            )
          );
        }
        resolve(results);
      }
    };

    bus.addMatch(signalMatchRule, (err) => {
      if (err) {
        return reject(
          new Error(`Failed to add signal match for ${requestHandle}: ${err}`)
        );
      }

      bus.connection.on("message", onResponse);
    });
  });
}

async function _sendKey(bus, keysym, state) {
  const sessionHandle = getRemoteDesktopSessionHandle();
  if (!sessionHandle) {
    throw new Error("Cannot send key: No active remote desktop session.");
  }

  await invoke(bus, {
    destination: PORTAL_DESTINATION,
    path: PORTAL_PATH,
    interface: REMOTE_DESKTOP_IFACE,
    member: "NotifyKeyboardKeysym",
    signature: "oa{sv}iu",
    body: [sessionHandle, [], keysym, state],
  });
}

async function startRemoteDesktopSession() {
  if (getRemoteDesktopSessionHandle()) {
    logWarn("A remote desktop session is already active. Aborting start.");
    return;
  }

  const bus = await _getBus();
  const token = `lutris_gamepad_ui_${Date.now()}`;

  try {
    const createResults = await _portalRequest(bus, {
      destination: PORTAL_DESTINATION,
      path: PORTAL_PATH,
      interface: REMOTE_DESKTOP_IFACE,
      member: "CreateSession",
      signature: "a{sv}",
      body: [[["session_handle_token", ["s", token]]]],
    });

    const sessionHandle = getVariantValue(createResults, "session_handle");
    if (!sessionHandle) {
      throw new Error("Portal did not return a session_handle.");
    }
    setRemoteDesktopSessionHandle(sessionHandle);

    await invoke(bus, {
      destination: PORTAL_DESTINATION,
      path: PORTAL_PATH,
      interface: REMOTE_DESKTOP_IFACE,
      member: "SelectDevices",
      signature: "oa{sv}",
      body: [
        sessionHandle,
        [["types", ["u", DEVICE_TYPE.KEYBOARD | DEVICE_TYPE.POINTER]]],
      ],
    });

    logInfo("Starting remote session... Please approve the permission prompt.");
    await _portalRequest(bus, {
      destination: PORTAL_DESTINATION,
      path: PORTAL_PATH,
      interface: REMOTE_DESKTOP_IFACE,
      member: "Start",
      signature: "osa{sv}",
      body: [sessionHandle, "", []],
    });

    logInfo("Remote desktop session started successfully.");
  } catch (error) {
    logError("Failed to start remote desktop session:", error.message);
    await stopRemoteDesktopSession();
    throw error;
  }
}

async function stopRemoteDesktopSession() {
  const sessionHandle = getRemoteDesktopSessionHandle();
  if (!sessionHandle) return;

  const bus = await _getBus();
  try {
    await invoke(bus, {
      destination: PORTAL_DESTINATION,
      path: sessionHandle,
      interface: SESSION_IFACE,
      member: "Close",
    });
  } catch (err) {
    logWarn(`Could not close session handle ${sessionHandle}:`, err.message);
  } finally {
    setRemoteDesktopSessionHandle(null);
  }
}

async function sendKeyCombination(keysyms) {
  if (!getRemoteDesktopSessionHandle()) {
    throw new Error("Cannot send key combination: Session not active.");
  }

  const bus = await _getBus();
  try {
    for (const key of keysyms) {
      await _sendKey(bus, key, KEY_STATE.PRESS);
    }

    for (const key of keysyms.slice().reverse()) {
      await _sendKey(bus, key, KEY_STATE.RELEASE);
    }
  } catch (error) {
    logError("Failed to send key combination:", error.message);
    throw error;
  }
}

async function sendAltTab() {
  await sendKeyCombination([KEYSYMS.Alt_L, KEYSYMS.Tab]);
}

module.exports = {
  startRemoteDesktopSession,
  stopRemoteDesktopSession,
  sendAltTab,
  sendKeyCombination,
};
