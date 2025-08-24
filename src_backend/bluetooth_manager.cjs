const dbus = require("@homebridge/dbus-native");
const { getMainWindow } = require("./state.cjs");
const {
  logInfo,
  logError,
  logWarn,
  execPromise,
  retryAsync,
} = require("./utils.cjs");

const BLUEZ_SERVICE_NAME = "org.bluez";
const BLUEZ_OBJECT_PATH = "/";
const OBJECT_MANAGER_INTERFACE = "org.freedesktop.DBus.ObjectManager";
const PROPERTIES_INTERFACE = "org.freedesktop.DBus.Properties";
const DEVICE_INTERFACE = "org.bluez.Device1";
const ADAPTER_INTERFACE = "org.bluez.Adapter1";
const DEBOUNCE_DELAY_MS = 250;

let systemBus = null;
let objectManager = null;
let initializationPromise = null;
let isSubscribed = false;
let debounceTimeout = null;

function _getBus() {
  if (systemBus) return Promise.resolve(systemBus);
  if (initializationPromise) return initializationPromise.then(() => systemBus);

  initializationPromise = new Promise((resolve, reject) => {
    try {
      const bus = dbus.systemBus();
      bus.connection.on("connect", () => {
        logInfo("Bluetooth manager connected to D-Bus successfully.");
        systemBus = bus;
        resolve();
      });
      bus.connection.on("error", (err) => {
        logError("D-Bus connection error.", err);
        initializationPromise = null;
        systemBus = null;
        reject(err);
      });
    } catch (e) {
      logError("Failed to initialize D-Bus connection.", e);
      initializationPromise = null;
      reject(e);
    }
  });

  return initializationPromise.then(() => systemBus);
}

async function _getObjectManager() {
  if (objectManager) return objectManager;
  const bus = await _getBus();
  const service = bus.getService(BLUEZ_SERVICE_NAME);
  return new Promise((resolve, reject) => {
    service.getInterface(
      BLUEZ_OBJECT_PATH,
      OBJECT_MANAGER_INTERFACE,
      (err, iface) => (err ? reject(err) : resolve(iface))
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
    service.getInterface(path, interfaceName, (err, iface) => {
      if (err)
        return reject(
          new Error(
            `Could not get interface ${interfaceName} at ${path}: ${err.message}`
          )
        );
      resolve(iface);
    });
  });
}

const _getVariantValue = (variant) => variant?.[1]?.[0];

const _findInterfaceProps = (interfaces, name) =>
  interfaces.find(([ifaceName]) => ifaceName === name)?.[1];

function _parseDeviceProperties(propertiesArray) {
  if (!Array.isArray(propertiesArray)) return null;
  const props = Object.fromEntries(
    propertiesArray.map(([key, variant]) => [key, _getVariantValue(variant)])
  );
  return {
    address: props.Address,
    name: props.Alias || props.Name,
    isPaired: props.Paired || false,
    isConnected: props.Connected || false,
    icon: props.Icon,
  };
}

function _parseAdapterProperties(propertiesArray) {
  if (!Array.isArray(propertiesArray)) return null;
  const props = Object.fromEntries(
    propertiesArray.map(([key, variant]) => [key, _getVariantValue(variant)])
  );
  return {
    address: props.Address,
    name: props.Alias || props.Name,
    powered: props.Powered || false,
    discoverable: props.Discoverable || false,
    discovering: props.Discovering || false,
  };
}

async function _getAllAdapterPaths() {
  try {
    const objManager = await _getObjectManager();
    return new Promise((resolve, reject) => {
      objManager.GetManagedObjects((err, managedObjects) => {
        if (err) return reject(err);
        const adapterPaths = managedObjects
          .filter(([, interfacesArray]) =>
            _findInterfaceProps(interfacesArray, ADAPTER_INTERFACE)
          )
          .map(([path]) => path);
        resolve(adapterPaths);
      });
    });
  } catch (e) {
    logError("Error getting adapter paths.", e.message);
    return [];
  }
}

async function getAdapters() {
  try {
    const objManager = await _getObjectManager();
    return new Promise((resolve, reject) => {
      objManager.GetManagedObjects((err, managedObjects) => {
        if (err) return reject(err);
        const adapters = managedObjects
          .map(([path, interfacesArray]) => {
            const props = _findInterfaceProps(
              interfacesArray,
              ADAPTER_INTERFACE
            );
            if (!props) return null;
            const adapter = _parseAdapterProperties(props);
            return adapter ? { ...adapter, path } : null;
          })
          .filter(Boolean);
        resolve(adapters);
      });
    });
  } catch (e) {
    logError("Could not list Bluetooth adapters.", e.message);
    return [];
  }
}

async function setAdapterBooleanProperty(adapterPath, propName, value) {
  return new Promise(async (resolve, reject) => {
    try {
      const iface = await _getInterface(adapterPath, PROPERTIES_INTERFACE);
      iface.Set(ADAPTER_INTERFACE, propName, ["b", value], (err) => {
        _triggerStateUpdate();
        if (err) {
          const errorMessage = `Failed to set property '${propName}' on ${adapterPath}. This may be a system permissions issue (polkit) or a hardware-level block.`;
          logError(
            errorMessage,
            "D-Bus error object:",
            JSON.stringify(err, null, 2)
          );
          reject(new Error(err.message || "Failed to set property"));
        } else {
          logInfo(`Property ${propName} set to ${value} on ${adapterPath}`);
          resolve();
        }
      });
    } catch (e) {
      const errorMessage = `Error setting property ${propName} on ${adapterPath}`;
      logError(errorMessage, e.message);
      reject(new Error(errorMessage));
    }
  });
}

async function powerOnAdapter(adapterPath) {
  try {
    logInfo("Attempting to unblock bluetooth via rfkill.");
    await execPromise("rfkill unblock bluetooth");
    logInfo("rfkill unblock command executed successfully.");
  } catch (e) {
    logWarn("Could not execute rfkill: ", e.message);
  }

  try {
    await retryAsync(
      () => setAdapterBooleanProperty(adapterPath, "Powered", true),
      {
        maxTries: 3,
        initialDelay: 300,
        onRetry: (error, attempt) => {
          logWarn(
            `Retrying power on for adapter ${adapterPath} (attempt ${attempt}). Error: ${error.message}`
          );
        },
      }
    );
  } catch (e) {
    logError(`Unable to power on adapter ${adapterPath}. Error:`, e);
  }
}

async function listDevices() {
  try {
    const objManager = await _getObjectManager();
    return new Promise((resolve, reject) => {
      objManager.GetManagedObjects((err, managedObjects) => {
        if (err) return reject(err);
        const devices = managedObjects
          .map(([path, interfacesArray]) => {
            const props = _findInterfaceProps(
              interfacesArray,
              DEVICE_INTERFACE
            );
            if (!props) return null;
            const device = _parseDeviceProperties(props);
            return device ? { ...device, path } : null;
          })
          .filter(Boolean);
        resolve(devices);
      });
    });
  } catch (e) {
    logError("Could not list Bluetooth devices.", e.message);
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
  } catch (e) {
    logError("Error getting full bluetooth state", e);
    return { adapters: [], devices: [] };
  }
}

async function _callOnInterface(path, ifaceName, method, actionDescription) {
  try {
    const iface = await _getInterface(path, ifaceName);
    iface[method]((err) => {
      if (err) {
        logError(`Failed to ${actionDescription}.`, err.message);
      } else {
        logInfo(`Action '${actionDescription}' acknowledged by BlueZ.`);
      }
      _triggerStateUpdate();
    });
  } catch (e) {
    logError(`Error initiating action '${actionDescription}'.`, e.message);
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
        `start discovery on ${path}`
      );
    } catch (e) {
      logError("Could not start discovery on adapter:", path, e);
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
        `stop discovery on ${path}`
      );
    } catch (e) {
      logError("Could not stop discovery on adapter:", path, e);
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
    `disconnect from ${path}`
  );

async function _sendFullStateUpdate() {
  const mainWindow = getMainWindow();
  if (!mainWindow) {
    return;
  }
  try {
    const state = await getBluetoothState();
    mainWindow.webContents.send("bluetooth-state-changed", state);
  } catch (e) {
    logError("Failed to send full Bluetooth state update.", e);
  }
}

function _triggerStateUpdate() {
  if (debounceTimeout) clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(_sendFullStateUpdate, DEBOUNCE_DELAY_MS);
}

async function subscribeToBluetoothChanges() {
  if (isSubscribed) return;

  try {
    const bus = await _getBus();
    const objManager = await _getObjectManager();
    isSubscribed = true;

    objManager.on("InterfacesAdded", () => _triggerStateUpdate());
    objManager.on("InterfacesRemoved", () => _triggerStateUpdate());

    const matchRule = `type='signal',interface='${PROPERTIES_INTERFACE}',member='PropertiesChanged',path_namespace='/org/bluez'`;
    bus.addMatch(matchRule, () => {
      _triggerStateUpdate();
    });

    _sendFullStateUpdate();
    logInfo("Subscribed to BlueZ D-Bus signals and sent initial state.");
  } catch (e) {
    isSubscribed = false;
    logError("Could not subscribe to Bluetooth changes.", e.message);
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
