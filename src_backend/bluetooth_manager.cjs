const { getSessionBus } = require("./dbus_manager.cjs");
const { getMainWindow } = require("./state.cjs");
const {
  logInfo,
  logError,
  logWarn,
  execPromise,
  retryAsync,
  debounce,
  toastError,
} = require("./utils.cjs");

const BLUEZ_SERVICE_NAME = "org.bluez";
const BLUEZ_OBJECT_PATH = "/";
const OBJECT_MANAGER_INTERFACE = "org.freedesktop.DBus.ObjectManager";
const PROPERTIES_INTERFACE = "org.freedesktop.DBus.Properties";
const DEVICE_INTERFACE = "org.bluez.Device1";
const ADAPTER_INTERFACE = "org.bluez.Adapter1";
const DEBOUNCE_DELAY_MS = 250;

let objectManager = null;
let isSubscribed = false;

function _getBus() {
  return getSessionBus("bluetooth_manager", true);
}

async function _getObjectManager() {
  if (objectManager) return objectManager;
  const bus = await _getBus();
  const service = bus.getService(BLUEZ_SERVICE_NAME);
  return new Promise((resolve, reject) => {
    service.getInterface(
      BLUEZ_OBJECT_PATH,
      OBJECT_MANAGER_INTERFACE,
      (error, iface) => (error ? reject(error) : resolve(iface)),
    );
  }).then((iface) => {
    objectManager = iface;
    return iface;
  });
}

async function _getInterface(path, interfaceName) {
  const bus = await _getBus();
  const service = bus.getService(BLUEZ_SERVICE_NAME);
  return new Promise((resolve, reject) => {
    service.getInterface(path, interfaceName, (error, iface) => {
      if (error)
        return reject(
          new Error(
            `Could not get interface ${interfaceName} at ${path}: ${error.message}`,
          ),
        );
      resolve(iface);
    });
  });
}

const _getVariantValue = (variant) => variant?.[1]?.[0];

const _findInterfaceProperties = (interfaces, name) =>
  interfaces.find(([ifaceName]) => ifaceName === name)?.[1];

function _parseDeviceProperties(propertiesArray) {
  if (!Array.isArray(propertiesArray)) return null;
  const properties = Object.fromEntries(
    propertiesArray.map(([key, variant]) => [key, _getVariantValue(variant)]),
  );
  return {
    address: properties.Address,
    name: properties.Alias || properties.Name,
    isPaired: properties.Paired || false,
    isConnected: properties.Connected || false,
    icon: properties.Icon,
  };
}

function _parseAdapterProperties(propertiesArray) {
  if (!Array.isArray(propertiesArray)) return null;
  const properties = Object.fromEntries(
    propertiesArray.map(([key, variant]) => [key, _getVariantValue(variant)]),
  );
  return {
    address: properties.Address,
    name: properties.Alias || properties.Name,
    powered: properties.Powered || false,
    discoverable: properties.Discoverable || false,
    discovering: properties.Discovering || false,
  };
}

async function _getAllAdapterPaths() {
  try {
    const objectManager_ = await _getObjectManager();
    return new Promise((resolve, reject) => {
      objectManager_.GetManagedObjects((error, managedObjects) => {
        if (error) return reject(error);
        const adapterPaths = managedObjects
          .filter(([, interfacesArray]) =>
            _findInterfaceProperties(interfacesArray, ADAPTER_INTERFACE),
          )
          .map(([path]) => path);
        resolve(adapterPaths);
      });
    });
  } catch (error) {
    logError("Error getting adapter paths.", error.message);
    return [];
  }
}

async function getAdapters() {
  try {
    const objectManager_ = await _getObjectManager();
    return new Promise((resolve, reject) => {
      objectManager_.GetManagedObjects((error, managedObjects) => {
        if (error) return reject(error);
        const adapters = managedObjects
          .map(([path, interfacesArray]) => {
            const properties = _findInterfaceProperties(
              interfacesArray,
              ADAPTER_INTERFACE,
            );
            if (!properties) return null;
            const adapter = _parseAdapterProperties(properties);
            return adapter ? { ...adapter, path } : null;
          })
          .filter(Boolean);
        resolve(adapters);
      });
    });
  } catch (error) {
    logError("Could not list Bluetooth adapters.", error.message);
    return [];
  }
}

async function setAdapterBooleanProperty(adapterPath, propertyName, value) {
  try {
    const iface = await _getInterface(adapterPath, PROPERTIES_INTERFACE);
    return new Promise((resolve, reject) => {
      iface.Set(ADAPTER_INTERFACE, propertyName, ["b", value], (error) => {
        _triggerStateUpdate();
        if (error) {
          const errorMessage = `Failed to set property '${propertyName}' on ${adapterPath}. This may be a system permissions issue (polkit) or a hardware-level block.`;
          logError(
            errorMessage,
            "D-Bus error object:",
            JSON.stringify(error, null, 2),
          );
          reject(new Error(error.message || "Failed to set property"));
        } else {
          logInfo(`Property ${propertyName} set to ${value} on ${adapterPath}`);
          resolve();
        }
      });
    });
  } catch (error) {
    const errorMessage = `Error setting property ${propertyName} on ${adapterPath}`;
    logError(errorMessage, error.message);
    throw new Error(errorMessage);
  }
}

async function powerOnAdapter(adapterPath) {
  try {
    logInfo("Attempting to unblock bluetooth via rfkill.");
    await execPromise("rfkill unblock bluetooth");
    logInfo("rfkill unblock command executed successfully.");
  } catch (error) {
    logWarn("Could not execute rfkill: ", error.message);
  }

  try {
    await retryAsync(
      () => setAdapterBooleanProperty(adapterPath, "Powered", true),
      {
        maxTries: 3,
        initialDelay: 300,
        onRetry: (error, attempt) => {
          logWarn(
            `Retrying power on for adapter ${adapterPath} (attempt ${attempt}). Error: ${error.message}`,
          );
        },
      },
    );
  } catch (error) {
    logError(`Unable to power on adapter ${adapterPath}. Error:`, error);
  }
}

async function listDevices() {
  try {
    const objectManager_ = await _getObjectManager();
    return new Promise((resolve, reject) => {
      objectManager_.GetManagedObjects((error, managedObjects) => {
        if (error) return reject(error);
        const devices = managedObjects
          .map(([path, interfacesArray]) => {
            const properties = _findInterfaceProperties(
              interfacesArray,
              DEVICE_INTERFACE,
            );
            if (!properties) return null;
            const device = _parseDeviceProperties(properties);
            return device ? { ...device, path } : null;
          })
          .filter(Boolean);
        resolve(devices);
      });
    });
  } catch (error) {
    logError("Could not list Bluetooth devices.", error.message);
    return [];
  }
}

async function getBluetoothState() {
  try {
    const [adapters, devices] = await Promise.all([
      getAdapters(),
      listDevices(),
    ]);
    return { adapters, devices };
  } catch (error) {
    logError("Error getting full bluetooth state", error);
    objectManager = null;
    isSubscribed = false;
    return { adapters: [], devices: [] };
  }
}

async function _callOnInterface(path, ifaceName, method, actionDescription) {
  try {
    const iface = await _getInterface(path, ifaceName);
    iface[method]((error) => {
      if (error) {
        logError(`Failed to ${actionDescription}.`, error.message);
      } else {
        logInfo(`Action '${actionDescription}' acknowledged by BlueZ.`);
      }
      _triggerStateUpdate();
    });
  } catch (error) {
    logError(`Error initiating action '${actionDescription}'.`, error.message);
  }
}

async function startDiscovery() {
  const adapterPaths = await _getAllAdapterPaths();
  if (adapterPaths.length === 0) {
    logError("Could not start discovery: no Bluetooth adapters found.");
    return;
  }
  for (const path of adapterPaths) {
    try {
      await _callOnInterface(
        path,
        ADAPTER_INTERFACE,
        "StartDiscovery",
        `start discovery on ${path}`,
      );
    } catch (error) {
      logError("Could not start discovery on adapter:", path, error);
    }
  }
}

async function stopDiscovery() {
  const adapterPaths = await _getAllAdapterPaths();
  if (adapterPaths.length === 0) return;
  for (const path of adapterPaths) {
    try {
      await _callOnInterface(
        path,
        ADAPTER_INTERFACE,
        "StopDiscovery",
        `stop discovery on ${path}`,
      );
    } catch (error) {
      logError("Could not stop discovery on adapter:", path, error);
    }
  }
}

const connectToDevice = (path) =>
  _callOnInterface(path, DEVICE_INTERFACE, "Connect", `connect to ${path}`);

const disconnectFromDevice = (path) =>
  _callOnInterface(
    path,
    DEVICE_INTERFACE,
    "Disconnect",
    `disconnect from ${path}`,
  );

async function _sendFullStateUpdate() {
  const mainWindow = getMainWindow();
  if (!mainWindow) {
    return;
  }
  try {
    const state = await getBluetoothState();
    mainWindow.webContents.send("bluetooth-state-changed", state);
  } catch (error) {
    logError("Failed to send full Bluetooth state update.", error);
  }
}

const _triggerStateUpdate = debounce(_sendFullStateUpdate, DEBOUNCE_DELAY_MS);

async function subscribeToBluetoothChanges() {
  if (isSubscribed) return;

  try {
    isSubscribed = true;

    const bus = await _getBus();
    const objectManager_ = await _getObjectManager();

    bus.connection.on("end", () => {
      logWarn("Bluetooth DBus connection ended. Resetting subscription state.");
      isSubscribed = false;
      objectManager = null;
    });

    objectManager_.on("InterfacesAdded", () => _triggerStateUpdate());
    objectManager_.on("InterfacesRemoved", () => _triggerStateUpdate());

    const matchRule = `type='signal',interface='${PROPERTIES_INTERFACE}',member='PropertiesChanged',path_namespace='/org/bluez'`;

    bus.addMatch(matchRule, (error) => {
      if (error) {
        logError(
          "Failed to add DBus match rule for Bluetooth properties:",
          error,
        );
      }
    });

    bus.connection.on("message", (message) => {
      if (
        message.interface === PROPERTIES_INTERFACE &&
        message.member === "PropertiesChanged"
      ) {
        _triggerStateUpdate();
      }
    });

    _sendFullStateUpdate();
    logInfo("Subscribed to BlueZ D-Bus signals and sent initial state.");
  } catch (error) {
    isSubscribed = false;
    objectManager = null;
    logError("Could not subscribe to Bluetooth changes.", error.message);
    toastError("Bluetooth Manager", error);
  }
}

module.exports = {
  getBluetoothState,
  powerOnAdapter,
  startDiscovery,
  stopDiscovery,
  connectToDevice,
  disconnectFromDevice,
  subscribeToBluetoothChanges,
};
