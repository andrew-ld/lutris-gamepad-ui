const dbus = require("@homebridge/dbus-native");
const { logInfo, logError } = require("./utils.cjs");

const sessionBuses = new Map();
const sessionBusPromises = new Map();

/**
 * @returns {Promise<import('@homebridge/dbus-native').MessageBus>}
 */
function getSessionBus(sessionName, isSystemBus) {
  if (isSystemBus) {
    sessionName += "_system_bus";
  } else {
    sessionName += "_session_bus";
  }

  if (sessionBuses.has(sessionName)) {
    return Promise.resolve(sessionBuses.get(sessionName));
  }

  if (sessionBusPromises.has(sessionName)) {
    return sessionBusPromises.get(sessionName);
  }

  const busPromise = new Promise((resolve, reject) => {
    try {
      let bus;
      if (isSystemBus) {
        bus = dbus.systemBus();
      } else {
        bus = dbus.sessionBus();
      }
      if (!bus) {
        sessionBusPromises.delete(sessionName);
        return reject(new Error("Could not create D-Bus session bus client."));
      }

      bus.connection.on("connect", () => {
        logInfo(
          `D-Bus session bus connection successful for "${sessionName}".`
        );
        sessionBuses.set(sessionName, bus);
        sessionBusPromises.delete(sessionName);
        resolve(bus);
      });

      bus.connection.on("error", (err) => {
        logError(
          `D-Bus session bus connection error for "${sessionName}":`,
          err
        );
        sessionBuses.delete(sessionName);
        sessionBusPromises.delete(sessionName);
        reject(
          new Error(
            `D-Bus connection error for "${sessionName}": ${err.message}`
          )
        );
      });

      bus.connection.on("end", () => {
        logInfo(`D-Bus session bus connection ended for "${sessionName}".`);
        sessionBuses.delete(sessionName);
        sessionBusPromises.delete(sessionName);
      });
    } catch (err) {
      logError(
        `Failed to initiate D-Bus session bus connection for "${sessionName}":`,
        err
      );
      sessionBusPromises.delete(sessionName);
      reject(err);
    }
  });

  sessionBusPromises.set(sessionName, busPromise);
  return busPromise;
}

module.exports = { getSessionBus };
