const dbus = require("@homebridge/dbus-native");

const { logInfo, logError } = require("./utils.cjs");

const sessionBuses = new Map();
const sessionBusPromises = new Map();

/**
 * @returns {Promise<import('@homebridge/dbus-native').MessageBus>}
 */
function getSessionBus(sessionName, isSystemBus) {
  sessionName += isSystemBus ? "_system_bus" : "_session_bus";

  if (sessionBuses.has(sessionName)) {
    return Promise.resolve(sessionBuses.get(sessionName));
  }

  if (sessionBusPromises.has(sessionName)) {
    return sessionBusPromises.get(sessionName);
  }

  const busPromise = new Promise((resolve, reject) => {
    try {
      let bus;
      bus = isSystemBus ? dbus.systemBus() : dbus.sessionBus();
      if (!bus) {
        sessionBusPromises.delete(sessionName);
        return reject(new Error("Could not create D-Bus session bus client."));
      }

      bus.connection.on("connect", () => {
        logInfo(
          `D-Bus session bus connection successful for "${sessionName}".`,
        );
        sessionBuses.set(sessionName, bus);
        sessionBusPromises.delete(sessionName);
        resolve(bus);
      });

      bus.connection.on("error", (error) => {
        logError(
          `D-Bus session bus connection error for "${sessionName}":`,
          error,
        );
        sessionBuses.delete(sessionName);
        sessionBusPromises.delete(sessionName);
        reject(
          new Error(
            `D-Bus connection error for "${sessionName}": ${error.message}`,
          ),
        );
      });

      bus.connection.on("end", () => {
        logInfo(`D-Bus session bus connection ended for "${sessionName}".`);
        sessionBuses.delete(sessionName);
        sessionBusPromises.delete(sessionName);
      });
    } catch (error) {
      logError(
        `Failed to initiate D-Bus session bus connection for "${sessionName}":`,
        error,
      );
      sessionBusPromises.delete(sessionName);
      reject(error);
    }
  });

  sessionBusPromises.set(sessionName, busPromise);
  return busPromise;
}

module.exports = { getSessionBus };
